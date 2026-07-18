import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import type { AiClassificationResult, JwtPayload, LeadStage } from "@growvisi/shared";
import { DOMAIN_EVENTS, LEAD_STAGE_ORDER, QUEUES } from "@growvisi/shared";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationsService } from "../automations/automations.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { BusinessEventService } from "../events/business-event.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { ActionExecutorService } from "../intelligence/action-executor.service";
import { ActionPlannerService } from "../intelligence/action-planner.service";
import { ContextBuilderService } from "../intelligence/context-builder.service";
import { ObservedMemoryService } from "../intelligence/observed-memory.service";
import { ReplyPolicyService } from "../intelligence/reply-policy.service";
import { readIntelligenceSettingsFromOrg } from "../intelligence/workspace-intelligence-settings";
import { useBackgroundWorkers } from "../../config/workers";
import { deferBackgroundTask } from "../../common/utils/defer-background";
import { withTimeout } from "../../common/utils/with-timeout";

export interface ClassifyJobData {
  organizationId: string;
  conversationId: string;
  messageId: string;
  leadId: string;
  correlationId?: string;
  refreshAfterCorrection?: boolean;
  lockStage?: boolean;
  lockHandoff?: boolean;
  humanFeedback?: {
    stage?: string;
    score?: number;
    requiresHuman?: boolean;
    intent?: string;
    note?: string;
  };
}

export type HumanAiCorrectionInput = {
  stage?: LeadStage;
  score?: number;
  requiresHuman?: boolean;
  intent?: string;
  note?: string;
};

const STAGE_SCORE: Record<LeadStage, number> = {
  NEW: 10,
  CONTACTED: 25,
  QUALIFIED: 50,
  PROPOSAL: 70,
  NEGOTIATION: 85,
  WON: 100,
  LOST: 0,
};

@Injectable()
export class AiClassifyService {
  private readonly logger = new Logger(AiClassifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly automations: AutomationsService,
    private readonly entitlements: EntitlementsService,
    private readonly events: BusinessEventService,
    private readonly realtime: RealtimeGateway,
    private readonly webhooks: WebhookDispatchService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly knowledge: KnowledgeRetrievalService,
    private readonly memory: ObservedMemoryService,
    private readonly planner: ActionPlannerService,
    private readonly replyPolicy: ReplyPolicyService,
    private readonly executor: ActionExecutorService,
    @InjectQueue(QUEUES.AI_CLASSIFY) private readonly classifyQueue: Queue,
  ) {}

  async enqueue(data: ClassifyJobData, opts?: { background?: boolean }) {
    const run = () => this.process(data);

    if (!useBackgroundWorkers()) {
      if (opts?.background) {
        deferBackgroundTask(run);
        return;
      }
      await run();
      return;
    }

    const jobId = createHash("sha256")
      .update(
        data.refreshAfterCorrection
          ? `correction:${data.organizationId}:${data.messageId}`
          : `${data.organizationId}:${data.messageId}`,
      )
      .digest("hex");

    try {
      await withTimeout(
        this.classifyQueue.add("classify", data, {
          jobId,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }),
        5_000,
        "Queue unavailable",
      );
    } catch (err) {
      this.logger.warn(
        `Could not enqueue classification for ${data.messageId} (${err instanceof Error ? err.message : err}) — processing inline`,
      );
      await this.process(data);
    }
  }

  async applyHumanCorrection(
    user: JwtPayload,
    conversationId: string,
    input: HumanAiCorrectionInput,
  ) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const hasField =
      input.stage != null ||
      input.score != null ||
      input.requiresHuman != null ||
      (input.intent != null && input.intent.trim().length > 0) ||
      (input.note != null && input.note.trim().length > 0);
    if (!hasField) {
      throw new BadRequestException("Provide at least one correction field.");
    }
    if (input.score != null && (input.score < 0 || input.score > 100)) {
      throw new BadRequestException("Score must be 0–100.");
    }
    if (input.stage && !LEAD_STAGE_ORDER.includes(input.stage)) {
      throw new BadRequestException("Invalid stage.");
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      include: { lead: true },
    });
    if (!conversation?.lead) {
      throw new NotFoundException("Conversation or lead not found");
    }

    const lead = conversation.lead;
    const prevProfile =
      lead.profile && typeof lead.profile === "object"
        ? (lead.profile as Record<string, unknown>)
        : {};
    const meta =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};

    const nextStage = input.stage ?? (lead.stage as LeadStage);
    const nextScore =
      input.score ?? (input.stage ? STAGE_SCORE[input.stage] : lead.score);
    const nextIntent =
      input.intent?.trim() ||
      (typeof prevProfile.lastIntent === "string" ? prevProfile.lastIntent : undefined);

    const correctionAt = new Date().toISOString();
    const humanCorrection = {
      at: correctionAt,
      by: user.sub,
      stage: nextStage,
      score: nextScore,
      requiresHuman: input.requiresHuman ?? meta.requiresHuman === true,
      intent: nextIntent ?? null,
      note: input.note?.trim().slice(0, 500) || null,
      previous: {
        stage: lead.stage,
        score: lead.score,
        confidence: lead.aiConfidence,
        intent: prevProfile.lastIntent ?? null,
        requiresHuman: meta.requiresHuman === true,
      },
    };

    const correctionRun = await this.prisma.aiRun.create({
      data: {
        organizationId: user.organizationId,
        conversationId,
        type: "classify_correction",
        provider: "human",
        model: "agent",
        status: "COMPLETED",
        input: { correctedBy: user.sub },
        output: humanCorrection as object,
        completedAt: new Date(),
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          stage: nextStage as never,
          score: nextScore,
          aiConfidence: 1,
          lastClassifiedAt: new Date(),
          wonAt: nextStage === "WON" ? new Date() : null,
          lostAt: nextStage === "LOST" ? new Date() : null,
          profile: {
            ...prevProfile,
            ...(nextIntent ? { lastIntent: nextIntent } : {}),
            humanCorrection,
            humanCorrectedAt: correctionAt,
          },
        },
      });

      if (input.stage && input.stage !== lead.stage) {
        await tx.leadStageHistory.create({
          data: {
            leadId: lead.id,
            fromStage: lead.stage,
            toStage: input.stage as never,
            reason:
              input.note?.trim() ||
              `Human corrected AI classification${nextIntent ? `: ${nextIntent}` : ""}`,
            changedBy: user.sub,
            aiRunId: correctionRun.id,
          },
        });
      }

      if (input.requiresHuman != null) {
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            metadata: {
              ...meta,
              requiresHuman: input.requiresHuman,
              ...(input.requiresHuman
                ? {
                    handoffReason: nextIntent || "Human flagged for reply",
                    handoffAt: correctionAt,
                  }
                : {
                    handoffResolvedAt: correctionAt,
                    handoffResolvedBy: user.sub,
                  }),
            },
          },
        });
      }
    });

    await this.memory.recordHumanCorrection(conversationId, {
      intent: nextIntent,
      note: input.note,
      stage: nextStage,
      score: nextScore,
      correctionId: correctionRun.id,
    });

    void this.events.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.CONVERSATION_AI_CORRECTION,
      entityType: "conversation",
      entityId: conversationId,
      payload: { leadId: lead.id, correctionId: correctionRun.id },
    });

    if (input.stage && input.stage !== lead.stage) {
      this.realtime.emitLeadStageChanged(user.organizationId, {
        leadId: lead.id,
        fromStage: lead.stage,
        toStage: input.stage,
        confidence: 1,
      });
      void this.webhooks.emit(user.organizationId, "lead.stage.changed", {
        leadId: lead.id,
        fromStage: lead.stage,
        toStage: input.stage,
        phone: lead.phone,
        displayName: lead.displayName,
        isAi: false,
        humanCorrected: true,
        at: correctionAt,
      });
    }

    if (input.requiresHuman === true) {
      this.realtime.emitLeadHandoff(user.organizationId, {
        conversationId,
        leadId: lead.id,
        reason: nextIntent || "Human flagged for reply",
      });
    }

    this.realtime.emitInboxUpdated(user.organizationId);

    const latestMessage = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latestMessage) {
      void this.enqueue({
        organizationId: user.organizationId,
        conversationId,
        messageId: `correction:${correctionRun.id}:${latestMessage.id}`,
        leadId: lead.id,
        refreshAfterCorrection: true,
        lockStage: true,
        lockHandoff: true,
        humanFeedback: {
          stage: nextStage,
          score: nextScore,
          requiresHuman: humanCorrection.requiresHuman,
          intent: nextIntent,
          note: input.note?.trim(),
        },
      }).catch((err) => {
        this.logger.warn(
          `Post-correction reclassify failed: ${err instanceof Error ? err.message : err}`,
        );
      });
    }

    return {
      ok: true,
      correctionId: correctionRun.id,
      stage: nextStage,
      score: nextScore,
      requiresHuman: humanCorrection.requiresHuman,
      reclassifyQueued: !!latestMessage,
    };
  }

  async process(data: ClassifyJobData) {
    await this.entitlements.assertHasAccess(data.organizationId);

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.debug("OPENAI_API_KEY not set — skipping classification");
      return;
    }

    const ctx = await this.contextBuilder.buildForConversation(
      data.organizationId,
      data.conversationId,
    );

    if (!ctx.conversation.aiEnabled && !data.refreshAfterCorrection) {
      this.logger.debug(`AI disabled for conversation ${data.conversationId} — skipping`);
      return;
    }

    if (
      (ctx.lead.stage === "WON" || ctx.lead.stage === "LOST") &&
      !data.refreshAfterCorrection
    ) {
      return;
    }

    if (!ctx.transcript.trim()) {
      return;
    }

    const correlationId = data.correlationId ?? this.events.createCorrelationId();
    const model = this.config.get<string>("AI_CLASSIFY_MODEL") ?? "gpt-4o-mini";
    const started = Date.now();

    const knowledgeHits = await this.knowledge.retrieve({
      organizationId: data.organizationId,
      query: ctx.ragQuery,
      limit: 4,
    });
    const businessContext = this.knowledge.formatForPrompt(knowledgeHits);
    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
    const combinedContext = [businessContext, memoryBlock ? `Observed facts:\n${memoryBlock}` : ""]
      .filter(Boolean)
      .join("\n\n");

    const aiRun = await this.prisma.aiRun.create({
      data: {
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        type: data.refreshAfterCorrection ? "classify_refresh" : "classify",
        provider: "openai",
        model,
        status: "RUNNING",
        input: {
          messageId: data.messageId,
          leadId: data.leadId,
          humanFeedback: data.humanFeedback ?? null,
          knowledgeSources: knowledgeHits.map((h) => ({
            chunkId: h.chunkId,
            title: h.title,
            similarity: h.similarity,
          })),
        },
      },
    });

    try {
      let result = await this.callOpenAi(
        apiKey,
        model,
        ctx.lead.stage,
        ctx.transcript,
        combinedContext,
        data.humanFeedback,
      );

      const knowledgeGap = this.planner.detectKnowledgeGap(ctx, knowledgeHits);
      if (knowledgeGap) {
        result = this.planner.applyKnowledgeGapGuard(result, true);
      }

      const latencyMs = Date.now() - started;
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "COMPLETED",
          output: result as object,
          latencyMs,
          completedAt: new Date(),
        },
      });

      const prefs = await this.automations.getPreferencesForOrg(data.organizationId);
      const org = await this.prisma.organization.findUnique({
        where: { id: data.organizationId },
        select: { settings: true },
      });
      const orgSettings =
        org?.settings && typeof org.settings === "object"
          ? (org.settings as Record<string, unknown>)
          : {};
      const intelligenceSettings = readIntelligenceSettingsFromOrg(orgSettings);
      const withinReplyWindow =
        !!ctx.conversation.lastInboundAt &&
        Date.now() - ctx.conversation.lastInboundAt.getTime() < 24 * 60 * 60 * 1000;

      let autoSendPlanOk = false;
      if (intelligenceSettings.replyAutonomy === "auto_guarded") {
        try {
          await this.entitlements.assertPlanAtLeast(data.organizationId, "growth");
          autoSendPlanOk = true;
        } catch {
          autoSendPlanOk = false;
        }
      }

      const recentAutoSendCount = await this.prisma.message.count({
        where: {
          conversationId: data.conversationId,
          organizationId: data.organizationId,
          sentByAi: true,
          direction: "OUTBOUND",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const updateStage =
        prefs.stage &&
        !data.lockStage &&
        this.executor.shouldUpdateStage(ctx.lead.stage, result.stage, result.confidence);

      const stageChanged = await this.executor.applyLeadProfileUpdate(
        data.organizationId,
        data.leadId,
        result,
        {
          updateStage,
          preserveScore: Boolean(data.lockStage),
          currentStage: ctx.lead.stage,
          currentScore: ctx.lead.score,
          aiRunId: aiRun.id,
        },
      );

      await this.memory.syncFromClassification(ctx, result, aiRun.id);

      const score = this.executor.computeScore(
        result,
        Boolean(data.lockStage),
        ctx.lead.score,
      );

      const { actions, replyDecision } = this.planner.buildFromClassification({
        ctx,
        result,
        knowledgeHits,
        aiRunId: aiRun.id,
        autoStageEnabled: prefs.stage,
        lockStage: Boolean(data.lockStage),
        lockHandoff: Boolean(data.lockHandoff),
        stageChanged,
        score,
        handoffType: knowledgeGap ? "knowledge_gap" : "complex",
        workspaceAutonomy: intelligenceSettings.replyAutonomy,
        withinReplyWindow,
        autoSendPlanOk,
        recentAutoSendCount,
        automationPrefs: {
          stage: prefs.stage,
          notify: prefs.notify,
          handoff: prefs.handoff,
        },
      });

      await this.replyPolicy.persistDecision(
        data.organizationId,
        data.conversationId,
        replyDecision,
      );

      const event = await this.events.emit({
        organizationId: data.organizationId,
        type: DOMAIN_EVENTS.LEAD_CLASSIFIED,
        entityType: "lead",
        entityId: data.leadId,
        correlationId,
        payload: {
          conversationId: data.conversationId,
          messageId: data.messageId,
          aiRunId: aiRun.id,
        },
      });

      await this.executor.executePlan({
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        leadId: data.leadId,
        correlationId,
        triggerEventId: event.eventId,
        classification: result,
        actions,
        ctx,
        stageChanged,
      });

      void this.automations.handlePostClassification({
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        leadId: data.leadId,
        leadName: ctx.lead.displayName,
        leadPhone: ctx.lead.phone,
        score,
        stageChanged,
        newStage: result.stage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      });
      throw error;
    }
  }

  private async callOpenAi(
    apiKey: string,
    model: string,
    currentStage: LeadStage,
    transcript: string,
    businessContext?: string,
    humanFeedback?: ClassifyJobData["humanFeedback"],
  ): Promise<AiClassificationResult> {
    const stages = LEAD_STAGE_ORDER.join(", ");
    const contextBlock = businessContext?.trim()
      ? `\n\nBusiness knowledge (use to interpret pricing, policies, and offers — do not invent facts beyond this):\n${businessContext}`
      : "";
    const feedbackBlock = humanFeedback
      ? `\n\nHuman sales agent correction (treat as ground truth — do not contradict stage/score/handoff; improve summary and nextAction to match):\n${JSON.stringify(humanFeedback)}`
      : "";
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
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an AI revenue agent for Growvisi — classifying WhatsApp sales conversations for Indian SMBs.
The business may use Meta Business Agent to reply inside WhatsApp. Analyze the full thread to infer sales intent, pipeline stage, and what the team should do next.

Return JSON with these keys:
- stage: one of ${stages}
- confidence: 0-1
- intent: short intent phrase (e.g. "Pricing inquiry", "Ready to buy", "Complaint")
- sentiment: "positive" | "neutral" | "negative"
- suggestedActions: array of 1-3 concrete next steps for the sales team
- requiresHuman: true if customer asks for a person, is angry, payment dispute, or request is too complex
- summary: 1-2 sentence summary of what happened in this conversation so far
- tags: array of 1-4 short tags that describe this lead (e.g. "high-intent", "price-sensitive", "returning-customer", "urgent", "bulk-order")
- nextAction: the single most important thing the sales rep should do right now (e.g. "Send pricing PDF", "Call within 2 hours", "Follow up on delivery status")

Current pipeline stage: ${currentStage}.${contextBlock}${feedbackBlock}`,
            },
            {
              role: "user",
              content: `Classify this conversation:\n\n${transcript}`,
            },
          ],
        }),
      },
      25_000,
    );

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(body.error?.message ?? "OpenAI classification failed");
    }

    const raw = body.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("No classification returned");
    }

    const parsed = JSON.parse(raw) as Partial<AiClassificationResult>;
    const stage = this.normalizeStage(parsed.stage);
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));

    return {
      stage,
      confidence,
      intent: String(parsed.intent ?? "General inquiry"),
      sentiment: parsed.sentiment ?? "neutral",
      suggestedActions: Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions.map(String)
        : [],
      requiresHuman: Boolean(parsed.requiresHuman),
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 4) : [],
      nextAction: typeof parsed.nextAction === "string" ? parsed.nextAction.slice(0, 200) : undefined,
    };
  }

  private normalizeStage(value: unknown): LeadStage {
    const stage = String(value ?? "NEW").toUpperCase() as LeadStage;
    return LEAD_STAGE_ORDER.includes(stage) ? stage : "NEW";
  }
}
