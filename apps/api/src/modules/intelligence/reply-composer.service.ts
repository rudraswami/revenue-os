import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ReplyDecision, ReplyRiskLevel, AiClassificationResult, KnowledgeHit, BusinessEmployeeProfile } from "@growvisi/shared";
import {
  buildCloseActionsBlock,
  buildVoiceInstructions,
  defaultBusinessEmployeeProfile,
  formatContactName,
  formatCustomerCardBlock,
  isSimpleGreeting,
  resolveComposeLanguageInstruction,
} from "@growvisi/shared";
import {
  buildRagQuery,
  playbookForIntent,
  playbookForRelationshipPhase,
  resolveReplyIntentKind,
} from "./reply-intent";
import { fetchWithRetry, fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import { EntitlementsService } from "../billing/entitlements.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { PrismaService } from "../prisma/prisma.service";
import { ContextBuilderService, type ConversationContext } from "./context-builder.service";
import type { PipelineContext } from "./pipeline-context";
import type { PipelineSpans } from "./pipeline-spans";

export interface ComposedReply {
  suggestion: string;
  sources: Array<{
    chunkId: string;
    title: string;
    similarity: number;
    citation: string;
  }>;
  usedRag: boolean;
  aiRunId: string;
  fastPath?: boolean;
  /** Model self-report from the structured answer contract (undefined for fast path). */
  answeredEverything?: boolean;
  selfConfidence?: number;
  needsHuman?: boolean;
  unresolved?: string[];
}

interface ReplyContract {
  reply: string;
  answeredEverything?: boolean;
  confidence?: number;
  needsHuman?: boolean;
  unresolved?: string[];
}

export interface ComposeReplyInput {
  organizationId: string;
  conversationId: string;
  decision?: ReplyDecision;
  knowledgeGap?: boolean;
  manual?: boolean;
  classification?: AiClassificationResult | null;
  /** Reuse classify-turn context — skips duplicate DB + RAG */
  pipelineContext?: PipelineContext;
  /** Template text from fast path — skips LLM */
  fastReplyText?: string;
  /** Recent human-edited drafts used as few-shot voice examples. */
  voiceExemplars?: Array<{ draft: string; final: string }>;
}

@Injectable()
export class ReplyComposerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly knowledge: KnowledgeRetrievalService,
  ) {}

  async compose(input: ComposeReplyInput): Promise<ComposedReply> {
    await this.entitlements.assertHasAccess(input.organizationId);

    const spans = input.pipelineContext?.spans;
    spans?.mark("compose_start");

    const ctx =
      input.pipelineContext?.ctx ??
      (await this.contextBuilder.buildForConversation(
        input.organizationId,
        input.conversationId,
      ));
    spans?.measure("compose_context_ms", "compose_start");

    const classification =
      input.classification ??
      this.classificationFromProfile(ctx.lead.profile, ctx.lead.stage);

    if (input.fastReplyText?.trim()) {
      return this.recordFastReply(input, ctx, input.fastReplyText.trim(), classification);
    }

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new BadRequestException("Smart replies are not available on this workspace.");
    }

    const intentKind = resolveReplyIntentKind(ctx.lastInbound, classification);
    const playbook = [
      playbookForIntent(intentKind),
      playbookForRelationshipPhase(ctx.workingMemory.relationshipPhase),
    ].join(" ");

    // Always re-retrieve with the enriched post-classify query. The classify
    // step retrieves with raw `ctx.ragQuery` (message + memory) BEFORE
    // customerNeeds/replyBrief exist. The compose query uses
    // `buildRagQuery(classification)` which decomposes multi-part questions and
    // includes entities — producing materially different embeddings that find
    // chunks the pre-classify pass missed. Merge with pipeline hits so we keep
    // any lucky early matches AND add newly found chunks.
    let hits: KnowledgeHit[] = input.pipelineContext?.knowledgeHits ?? [];
    {
      const ragQuery = buildRagQuery(ctx.lastInbound, classification);
      const retrieval = await this.knowledge.retrieveDetailed({
        organizationId: input.organizationId,
        query: ragQuery,
        limit: 6,
        intentKind,
        lastInbound: ctx.lastInbound,
        customerNeeds: classification?.customerNeeds,
      });

      // Merge: keep existing pipeline hits, add any new chunks from the enriched
      // query, dedup by chunkId keeping the higher similarity.
      const byChunk = new Map<string, KnowledgeHit>();
      for (const h of hits) byChunk.set(h.chunkId, h);
      for (const h of retrieval.hits) {
        const existing = byChunk.get(h.chunkId);
        if (!existing || h.similarity > existing.similarity) {
          byChunk.set(h.chunkId, h);
        }
      }
      hits = Array.from(byChunk.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 8);
    }
    spans?.measure("compose_rag_ms", "compose_start");

    let knowledgeBlock = hits.length
      ? hits.map((h) => `### ${h.title}\n${h.content}`).join("\n\n")
      : "";

    // Fallback: if both pipeline and re-retrieval returned nothing, inject the
    // most recent knowledge documents directly so the LLM has SOMETHING to work
    // with. This covers edge cases where embeddings missed but docs exist.
    if (!knowledgeBlock) {
      const fallback = await this.knowledge.fallbackDocuments(input.organizationId, 3);
      if (fallback.length > 0) {
        knowledgeBlock = fallback
          .map((d) => `### ${d.title}\n${(d.rawContent ?? "").slice(0, 1500)}`)
          .join("\n\n");
      }
    }

    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
    const threadSummary =
      classification?.summary?.trim() ||
      ctx.observedMemory.find((m) => m.type === "summary")?.content?.trim() ||
      "";
    const customerCardBlock = ctx.workingMemory
      ? formatCustomerCardBlock(ctx.workingMemory)
      : "";
    const businessName =
      input.pipelineContext?.businessName ??
      (
        await this.prisma.organization.findUnique({
          where: { id: input.organizationId },
          select: { name: true },
        })
      )?.name;

    const businessProfile: BusinessEmployeeProfile =
      input.pipelineContext?.businessProfile ??
      defaultBusinessEmployeeProfile(businessName?.trim() || "our team");

    const rawContactName = ctx.conversation.contactName ?? ctx.lead.displayName ?? "there";
    const contactName = formatContactName(businessProfile, rawContactName);
    const intent = classification?.intent;
    const summary = classification?.summary;
    const nextAction = classification?.nextAction;
    const sentiment = classification?.sentiment;
    const stage = ctx.lead.stage;
    const greeting = isSimpleGreeting(ctx.lastInbound);
    // Model tiering: high-stakes routes (negotiation, complaint, low-confidence
    // "complex" path) get a stronger reasoning model; everything else stays on
    // the fast, cheap default to keep response latency low.
    const routePath = input.pipelineContext?.executionRoute?.path;
    const useStrongModel =
      routePath === "complex" ||
      intentKind === "pricing" ||
      intentKind === "negotiation" ||
      intentKind === "ready_to_buy" ||
      intentKind === "complaint";
    const model = useStrongModel
      ? this.config.get<string>("AI_CHAT_MODEL_COMPLEX") ?? "gpt-4o"
      : this.config.get<string>("AI_CHAT_MODEL") ?? "gpt-4o-mini";
    const started = Date.now();
    const risk = input.decision?.risk ?? (input.knowledgeGap ? "high" : "medium");
    // Structured JSON contract adds a small wrapper; keep enough headroom so the
    // reply text itself is never truncated (multi-part pricing/EMI answers need room).
    const maxTokens =
      intentKind === "greeting" || intentKind === "thanks"
        ? 160
        : intentKind === "pricing" || intentKind === "negotiation"
          ? 700
          : 520;

    const aiRun = await this.prisma.aiRun.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        type: "suggest_reply",
        provider: "openai",
        model,
        status: "RUNNING",
        input: {
          ragQuery: buildRagQuery(ctx.lastInbound, classification),
          hitCount: hits.length,
          auto: !input.manual,
          risk,
          intentKind,
          intent: classification?.intent,
          reusedContext: Boolean(input.pipelineContext),
          executionPath: input.pipelineContext?.executionRoute?.path,
        },
      },
    });

    spans?.mark("compose_llm_start");

    try {
      // Retry transient OpenAI failures — generating the text has no side effect
      // (the actual WhatsApp send happens later in reply-send), so retries are safe.
      const res = await fetchWithRetry(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: risk === "low" ? 0.35 : 0.4,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: this.systemPrompt({
                  knowledgeBlock,
                  memoryBlock,
                  customerCardBlock,
                  knowledgeGap: Boolean(input.knowledgeGap),
                  risk,
                  intent,
                  summary,
                  nextAction,
                  sentiment,
                  stage,
                  lastInbound: ctx.lastInbound,
                  greeting,
                  autoSend: input.decision?.mode === "send",
                  playbook,
                  intentKind,
                  relationshipPhase: ctx.workingMemory.relationshipPhase,
                  businessName,
                  contactName,
                  businessProfile,
                  classification: classification ?? undefined,
                  threadSummary,
                  businessContext: input.pipelineContext?.businessContext,
                  voiceExemplars: input.voiceExemplars,
                }),
              },
              {
                role: "user",
                content: `Draft the next WhatsApp reply. Respond directly to the customer's latest message.\n\nLatest message: "${ctx.lastInbound ?? "(none)"}"\n\nRecent thread:\n${this.recentTranscript(ctx)}`,
              },
            ],
          }),
        },
        { attempts: 2, timeoutMs: 25_000, baseDelayMs: 400 },
      );

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new BadRequestException(body.error?.message ?? "Could not generate a suggestion.");
      }

      const raw = body.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        throw new BadRequestException("No suggestion returned.");
      }

      const contract = this.parseReplyContract(raw);
      const suggestion = contract.reply.trim();
      if (!suggestion) {
        throw new BadRequestException("No suggestion returned.");
      }

      spans?.measure("compose_llm_ms", "compose_llm_start");
      const latencyMs = Date.now() - started;
      const sources = hits.map((h) => ({
        chunkId: h.chunkId,
        title: h.title,
        similarity: h.similarity,
        citation: h.citation,
      }));

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "COMPLETED",
          output: {
            suggestion,
            sources,
            usedRag: hits.length > 0,
            risk,
            intentKind,
            answeredEverything: contract.answeredEverything,
            selfConfidence: contract.confidence,
            needsHuman: contract.needsHuman,
            unresolved: contract.unresolved,
          } as object,
          inputTokens: body.usage?.prompt_tokens,
          outputTokens: body.usage?.completion_tokens,
          latencyMs,
          completedAt: new Date(),
          input: {
            ragQuery: buildRagQuery(ctx.lastInbound, classification),
            hitCount: hits.length,
            auto: !input.manual,
            risk,
            intentKind,
            intent: classification?.intent,
            reusedContext: Boolean(input.pipelineContext),
            executionPath: input.pipelineContext?.executionRoute?.path,
            spans: spans?.toJSON(),
          } as object,
        },
      });

      spans?.measure("compose_total_ms", "compose_start");

      return {
        suggestion,
        sources,
        usedRag: hits.length > 0,
        aiRunId: aiRun.id,
        answeredEverything: contract.answeredEverything,
        selfConfidence: contract.confidence,
        needsHuman: contract.needsHuman,
        unresolved: contract.unresolved,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      });
      throw error;
    }
  }

  /**
   * Parse the model's structured answer contract. The compose call uses JSON
   * mode, so this normally succeeds; if the model ever returns plain text we
   * degrade gracefully and treat the whole payload as the reply (no blocking).
   */
  private parseReplyContract(raw: string): ReplyContract {
    const clamp01 = (n: unknown): number | undefined => {
      const v = typeof n === "number" ? n : Number(n);
      if (!Number.isFinite(v)) return undefined;
      return Math.min(1, Math.max(0, v));
    };

    try {
      const json = JSON.parse(raw) as Record<string, unknown>;
      const reply =
        typeof json.reply === "string" && json.reply.trim().length > 0
          ? json.reply
          : typeof json.message === "string"
            ? json.message
            : "";
      if (!reply.trim()) {
        return { reply: raw };
      }
      const unresolved = Array.isArray(json.unresolved)
        ? json.unresolved
            .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
            .slice(0, 5)
        : undefined;
      return {
        reply,
        answeredEverything:
          typeof json.answeredEverything === "boolean" ? json.answeredEverything : undefined,
        confidence: clamp01(json.confidence),
        needsHuman: typeof json.needsHuman === "boolean" ? json.needsHuman : undefined,
        unresolved,
      };
    } catch {
      return { reply: raw };
    }
  }

  private async recordFastReply(
    input: ComposeReplyInput,
    ctx: ConversationContext,
    suggestion: string,
    classification: AiClassificationResult | null,
  ): Promise<ComposedReply> {
    const intentKind = resolveReplyIntentKind(ctx.lastInbound, classification);
    const aiRun = await this.prisma.aiRun.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        type: "suggest_reply",
        provider: "template",
        model: "fast_path",
        status: "COMPLETED",
        input: {
          fastPath: true,
          intentKind,
          executionPath: "fast",
          auto: !input.manual,
        },
        output: { suggestion, fastPath: true, intentKind } as object,
        latencyMs: 0,
        completedAt: new Date(),
      },
    });

    return {
      suggestion,
      sources: [],
      usedRag: false,
      aiRunId: aiRun.id,
      fastPath: true,
    };
  }

  private recentTranscript(ctx: ConversationContext): string {
    return ctx.messages
      .slice(-12)
      .map((m) => {
        const who =
          m.direction === "INBOUND"
            ? "Customer"
            : m.sentByAi
              ? "AI"
              : "Business";
        return `${who}: ${m.content ?? "(media)"}`;
      })
      .join("\n");
  }

  /** Structured org profile for the system prompt — hours, location, etc. */
  private buildBusinessProfileBlock(opts: {
    businessName?: string | null;
    businessContext?: {
      hours?: string | null;
      address?: string | null;
      paymentMethods?: string | null;
      socialLinks?: string | null;
      phone?: string | null;
    } | null;
  }): string {
    const lines = [`## Business Profile`, `Business: ${opts.businessName ?? "this business"}`];
    const ctx = opts.businessContext;
    if (ctx?.hours) lines.push(`Hours: ${ctx.hours}`);
    if (ctx?.address) lines.push(`Location: ${ctx.address}`);
    if (ctx?.paymentMethods) lines.push(`Payment: ${ctx.paymentMethods}`);
    if (ctx?.socialLinks) lines.push(`Social: ${ctx.socialLinks}`);
    if (ctx?.phone) lines.push(`Phone: ${ctx.phone}`);
    return lines.length > 2 ? lines.join("\n") : "";
  }

  private systemPrompt(opts: {
    knowledgeBlock: string;
    memoryBlock: string;
    customerCardBlock: string;
    knowledgeGap: boolean;
    risk: ReplyRiskLevel;
    intent?: string;
    summary?: string;
    nextAction?: string;
    sentiment?: string;
    stage?: string;
    lastInbound?: string | null;
    greeting?: boolean;
    autoSend?: boolean;
    playbook: string;
    intentKind: string;
    relationshipPhase?: string;
    businessName?: string | null;
    contactName?: string;
    businessProfile: BusinessEmployeeProfile;
    classification?: AiClassificationResult;
    threadSummary?: string;
    /** Structured org context (hours, address, etc.) from context-builder. */
    businessContext?: {
      hours?: string | null;
      address?: string | null;
      paymentMethods?: string | null;
      socialLinks?: string | null;
      phone?: string | null;
    } | null;
    voiceExemplars?: Array<{ draft: string; final: string }>;
  }): string {
    const voiceLines = buildVoiceInstructions(opts.businessProfile);
    const languageLine = resolveComposeLanguageInstruction(
      opts.businessProfile,
      opts.lastInbound,
    );
    const classificationLanguage = opts.classification?.language;
    const languageInstruction =
      classificationLanguage && classificationLanguage !== "mixed"
        ? `Customer is writing in ${classificationLanguage} — match that language.`
        : languageLine;
    const closeActions = buildCloseActionsBlock(opts.businessProfile, opts.intentKind);
    const escalation = opts.businessProfile.escalation;

    const businessProfileBlock = this.buildBusinessProfileBlock({
      businessName: opts.businessName,
      businessContext: opts.businessContext,
    });

    const industryPersona = this.resolveIndustryPersona(
      opts.businessProfile,
      opts.businessName,
    );

    return [
      industryPersona,
      ...voiceLines,
      languageInstruction,

      // ── Core behavior ──
      opts.autoSend
        ? `This reply goes out automatically on WhatsApp. Write like a real person texting a customer — warm, helpful, and natural. Answer the question FIRST, then gently guide toward a next step if appropriate. Never sound scripted or robotic.`
        : "A teammate will review before sending. Draft a complete, ready-to-send reply that sounds natural.",

      `## How to write on WhatsApp
- Write like a real person, not a bot. Read your reply out loud — if it sounds like something a friend or helpful colleague would text, it's good.
- Keep it SHORT. 2-4 lines for simple questions. Max 6-8 lines for detailed answers.
- Use line breaks between thoughts — WhatsApp has no paragraphs.
- Use *bold* sparingly for key info (prices, product names, timings) — not on every word.
- Use bullet points (•) only for lists of 3+ items.
- Start with a warm, natural opener. Use the customer's name if available. Never "Dear Sir/Madam", "Greetings", or "I hope this message finds you well."
- End with a natural next step — a question or gentle nudge, not a hard sell. Match the customer's energy: if they sent 3 words, don't reply with a wall of text.
- DO NOT use formal letter formatting, "Regards", "Best wishes", or "Warm regards" at the end.
- DO NOT use phrases like "Thank you for reaching out", "I appreciate your inquiry", or "We value your interest" — they sound corporate and robotic.`,

      opts.greeting
        ? "The customer just said hello. Don't say 'Hello again' or 'nice to hear from you' if the thread already has messages."
        : "",
      opts.playbook,
      opts.relationshipPhase === "post_sale"
        ? "This customer already bought — help with service and logistics. No sales pressure, no upselling unless they ask."
        : opts.relationshipPhase === "win_back"
          ? "This customer may be returning after a past interaction — be welcoming and curious, not pushy."
          : "",

      // ── Classification context ──
      opts.classification?.replyBrief
        ? `Reply must cover: ${opts.classification.replyBrief}`
        : "",
      opts.classification?.customerNeeds?.length
        ? `Customer needs: ${opts.classification.customerNeeds.join("; ")}`
        : "",
      opts.classification?.unansweredFromCustomer?.length
        ? `Still unanswered: ${opts.classification.unansweredFromCustomer.join("; ")}`
        : "",
      opts.intent ? `Intent: ${opts.intent}` : "",
      opts.sentiment ? `Sentiment: ${opts.sentiment}` : "",
      opts.summary ? `Context: ${opts.summary}` : "",
      opts.threadSummary && opts.threadSummary !== opts.summary
        ? `Thread: ${opts.threadSummary}`
        : "",
      opts.stage ? `Deal stage: ${opts.stage}` : "",
      opts.lastInbound
        ? `Reply to this message from ${opts.contactName ?? "the customer"}: "${opts.lastInbound}"`
        : "",

      // ── Guardrails ──
      escalation.contactName
        ? `If you need to bring in a person, mention ${escalation.contactName} by role — do not invent names.`
        : "",
      opts.businessProfile.discountAuthority.mode === "none"
        ? "You cannot offer discounts. If the customer asks for one, say you'll check with the team."
        : "",

      `## How to answer
1. ALWAYS answer the question directly using the business knowledge below. Lead with the answer.
2. If a specific detail (exact price, timing) isn't in the knowledge, answer what you DO know and say you'll confirm that one detail — e.g. "We offer three plans starting from ₹X. Let me confirm the exact pricing for the plan you're interested in."
3. After answering, add ONE natural next step — a question or suggestion that feels like a helpful conversation, not a sales pitch.
4. NEVER reply with only "our team will get back to you" — that kills the conversation. Always add something useful.
5. NEVER invent prices, discounts, features, or policies not in the knowledge.
6. When the customer writes in Hindi/Hinglish, reply naturally in the same language. Don't force English.`,

      businessProfileBlock,
      "",
      opts.knowledgeBlock
        ? `## Business Knowledge\n\n${opts.knowledgeBlock}`
        : "",
      opts.memoryBlock ? `Customer memory:\n${opts.memoryBlock}` : "",
      opts.customerCardBlock ? `Customer card:\n${opts.customerCardBlock}` : "",
      closeActions ?? "",

      opts.voiceExemplars?.length
        ? `## Our writing style (learn from these real edits)\n${opts.voiceExemplars.map((e, i) => `Example ${i + 1}:\nAI draft: "${e.draft}"\nTeam corrected to: "${e.final}"`).join("\n\n")}\n\nAdopt the corrected style — that's how this business actually sounds.`
        : "",

      `## Good vs Bad replies

Customer: "What do you guys offer?"
BAD: "Thank you for reaching out. Our team will share the details with you shortly."
WHY BAD: Sounds robotic. Gives zero information. Customer will leave.
GOOD: "Hi! We provide digital marketing and automation solutions for businesses. Our main offerings include lead management, WhatsApp automation, and customer engagement tools. Want me to share more about any of these?"

Customer: "kitna cost hai?"
BAD: "Please share more details so we can provide pricing."
WHY BAD: Deflects instead of helping. Feels like talking to a machine.
GOOD: "Hi! Our plans start from ₹999/mo. The right plan depends on your team size and requirements — happy to walk you through the options!"

Customer: "I want to return my order"
GOOD: "I understand! Could you share your order number? I'll get this sorted for you quickly."

Customer: "Do you have any offers?"
BAD: "Thank you for your interest. Our sales team will reach out to you with the latest offers."
GOOD: "Yes! We're currently offering a 14-day free trial on all plans. Would you like to try it out?"`,

      'Respond with ONLY a JSON object (no markdown, no code fences) shaped exactly: {"reply": string, "answeredEverything": boolean, "unresolved": string[], "confidence": number, "needsHuman": boolean}. "reply" is the exact WhatsApp message to send (natural text, no JSON inside). "answeredEverything": true if your reply meaningfully addresses the core question — a helpful answer counts even if one detail needs confirmation. Set false only if you truly could not say anything useful. "unresolved": specific details you could NOT confirm. "confidence": 0-1 how well the reply resolves the message. "needsHuman": true ONLY for sensitive complaints, legal issues, refund disputes, or promises you cannot make.',
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Industry-aware opening persona. The handbook `profilePatch` sets voice
   * register and escalation but never overrides the compose system prompt
   * identity — this method fills that gap so a clinic sounds like a clinic
   * and a salon sounds like a salon.
   */
  private resolveIndustryPersona(
    profile: BusinessEmployeeProfile,
    businessName?: string | null,
  ): string {
    const name = businessName ?? "this business";
    const contact = profile.escalation?.contactName;

    if (profile.voice.register === "professional") {
      if (contact === "clinic reception") {
        return `You are the friendly receptionist at ${name}. You help patients with appointments, timings, and reports over WhatsApp. You are warm, patient, and professional. You NEVER give medical advice or diagnoses — always direct health questions to the doctor's visit. Think of yourself as the helpful person at the front desk who makes patients feel welcome.`;
      }
      if (contact === "admissions counsellor") {
        return `You are a helpful admissions counsellor at ${name}. You assist students and parents with course information, batch timings, fees, and the admission process over WhatsApp. You are knowledgeable, encouraging, and patient. You understand that choosing a course is a big decision and you help people make an informed choice without pressure.`;
      }
      if (contact === "design coordinator") {
        return `You are a design consultant at ${name}. You help clients explore interior design options, understand the process, and schedule consultations over WhatsApp. You are creative, professional, and detail-oriented. You understand that home design is personal and you guide clients with care and expertise.`;
      }
      if (contact === "sales executive") {
        return `You are a property advisor at ${name}. You help buyers with project details, configurations, pricing, and site visit scheduling over WhatsApp. You are knowledgeable, trustworthy, and factual. You NEVER overstate availability or invent pricing — you share only verified information and help buyers make confident decisions.`;
      }
    }

    if (contact === "front desk" || contact === "restaurant manager") {
      if (contact === "restaurant manager") {
        return `You are the friendly host at ${name}. You help customers with menu questions, reservations, and orders over WhatsApp. You are warm, quick, and enthusiastic about the food. Keep it brief and appetizing — people texting a restaurant want fast, helpful replies.`;
      }
      return `You are the friendly front desk at ${name}. You help customers with services, bookings, and availability over WhatsApp. You are warm, helpful, and quick to respond. You know the services well and help customers find exactly what they need.`;
    }

    return `You are a helpful team member at ${name} who handles customer conversations on WhatsApp. You are warm, knowledgeable, and genuinely interested in helping. You answer questions clearly, share relevant information from your knowledge, and guide customers naturally. Think of yourself as the friendly, knowledgeable person customers love chatting with — not a corporate salesperson.`;
  }

  private classificationFromProfile(
    profile: Record<string, unknown>,
    stage: string,
  ): AiClassificationResult | null {
    const intent = typeof profile.lastIntent === "string" ? profile.lastIntent : undefined;
    if (!intent) return null;
    return {
      stage: stage as AiClassificationResult["stage"],
      confidence: typeof profile.confidence === "number" ? profile.confidence : 0.6,
      intent,
      sentiment: (["positive", "neutral", "negative"] as const).includes(
        profile.lastSentiment as "positive",
      )
        ? (profile.lastSentiment as "positive" | "neutral" | "negative")
        : "neutral",
      suggestedActions: Array.isArray(profile.suggestedActions)
        ? profile.suggestedActions.map(String)
        : [],
      requiresHuman: false,
      summary: typeof profile.summary === "string" ? profile.summary : undefined,
      nextAction: typeof profile.nextAction === "string" ? profile.nextAction : undefined,
      tags: Array.isArray(profile.aiTags) ? profile.aiTags.map(String) : [],
    };
  }

  /** Human-reviewed draft translation for inbox composer (HI ↔ EN). */
  async translateComposerText(
    organizationId: string,
    text: string,
    target: "hi" | "en",
  ): Promise<string> {
    await this.entitlements.assertHasAccess(organizationId);

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException("Nothing to translate.");
    }

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new BadRequestException("Translation is not available on this workspace.");
    }

    const model = this.config.get<string>("OPENAI_REPLY_MODEL") ?? "gpt-4o-mini";
    const targetLabel = target === "hi" ? "Hindi (Devanagari script)" : "English";

    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 400,
          messages: [
            {
              role: "system",
              content:
                "Translate WhatsApp business reply drafts. Preserve tone, names, numbers, and ₹ amounts. Output only the translated text — no quotes or commentary.",
            },
            {
              role: "user",
              content: `Translate to ${targetLabel}:\n\n${trimmed}`,
            },
          ],
        }),
      },
      20_000,
    );

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new BadRequestException(body.error?.message ?? "Translation failed.");
    }

    const translated = body.choices?.[0]?.message?.content?.trim();
    if (!translated) {
      throw new BadRequestException("Translation returned empty text.");
    }

    return translated;
  }
}
