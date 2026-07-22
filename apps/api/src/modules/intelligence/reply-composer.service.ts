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

    let hits: KnowledgeHit[] = input.pipelineContext?.knowledgeHits ?? [];
    if (hits.length === 0 && !input.pipelineContext) {
      const ragQuery = buildRagQuery(ctx.lastInbound, classification);
      const retrieval = await this.knowledge.retrieveDetailed({
        organizationId: input.organizationId,
        query: ragQuery,
        limit: 5,
        intentKind,
        lastInbound: ctx.lastInbound,
        customerNeeds: classification?.customerNeeds,
      });
      hits = retrieval.hits;
    }
    spans?.measure("compose_rag_ms", "compose_start");

    let knowledgeBlock = hits.length
      ? hits.map((h) => `### ${h.title}\n${h.content}`).join("\n\n")
      : "";

    if (!knowledgeBlock && !input.pipelineContext) {
      const fallback = await this.knowledge.fallbackDocuments(input.organizationId, 3);
      if (fallback.length > 0) {
        knowledgeBlock = fallback
          .map((d) => `### ${d.title}\n${(d.rawContent ?? "").slice(0, 800)}`)
          .join("\n\n");
      }
    }

    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
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
    const model = this.config.get<string>("AI_CHAT_MODEL") ?? "gpt-4o-mini";
    const started = Date.now();
    const risk = input.decision?.risk ?? (input.knowledgeGap ? "high" : "medium");
    // Courtesy replies stay tiny; real questions get room to answer completely
    // (multi-part pricing/delivery/EMI answers were being truncated at 150).
    const maxTokens =
      intentKind === "greeting" || intentKind === "thanks" ? 90 : 450;

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

      const suggestion = body.choices?.[0]?.message?.content?.trim();
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

    return [
      `You are the WhatsApp sales assistant for ${opts.businessName ?? "this business"}. Indian SMB tone: warm, clear, professional.`,
      ...voiceLines,
      languageInstruction,
      opts.autoSend
        ? "This goes out automatically on WhatsApp — write like a sharp, experienced sales rep, not a bot. Fully answer every part of the customer's question using the business knowledge below. Be complete but concise: keep it skimmable with short lines or a few bullets, and don't pad. If something genuinely isn't covered, answer what you can and ask one focused clarifying question."
        : "A teammate will review before sending. Draft the strongest possible complete answer so it can be sent as-is.",
      opts.greeting
        ? "Do not say 'Hello again' or 'nice to hear from you' if the thread already has messages."
        : "",
      opts.playbook,
      opts.relationshipPhase === "post_sale"
        ? "Customer already won — help with service and logistics, not sales pressure."
        : opts.relationshipPhase === "win_back"
          ? "Customer may be returning after a lost deal — be welcoming, not pushy."
          : "",
      opts.classification?.replyBrief
        ? `Reply checklist: ${opts.classification.replyBrief}`
        : "",
      opts.classification?.customerNeeds?.length
        ? `Address each customer need: ${opts.classification.customerNeeds.join("; ")}`
        : "",
      opts.classification?.unansweredFromCustomer?.length
        ? `Unanswered questions to cover: ${opts.classification.unansweredFromCustomer.join("; ")}`
        : "",
      opts.intent ? `Thread intent: ${opts.intent}` : "",
      opts.sentiment ? `Sentiment: ${opts.sentiment}` : "",
      opts.summary ? `Context: ${opts.summary}` : "",
      opts.stage ? `Deal stage: ${opts.stage}` : "",
      opts.lastInbound
        ? `Reply to this exact message from ${opts.contactName ?? "the customer"}: "${opts.lastInbound}"`
        : "",
      escalation.contactName
        ? `If you must defer to a human, mention ${escalation.contactName} will follow up — do not invent other names.`
        : "",
      opts.businessProfile.discountAuthority.mode === "none"
        ? "Never promise discounts or price cuts — escalate discount requests to the team."
        : "",
      "Never invent prices, discounts, or policies. Use business knowledge when present.",
      opts.knowledgeGap
        ? "No pricing docs matched — ask clarifying questions only."
        : "",
      opts.knowledgeBlock
        ? `Business knowledge:\n\n${opts.knowledgeBlock}`
        : "",
      opts.memoryBlock ? `Customer memory:\n${opts.memoryBlock}` : "",
      opts.customerCardBlock ? `Customer card:\n${opts.customerCardBlock}` : "",
      closeActions ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");
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
