import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import type { AiClassificationResult, JwtPayload, LeadStage, ReplyDecision } from "@growvisi/shared";
import { DOMAIN_EVENTS, HOT_LEAD_SCORE_THRESHOLD, LEAD_STAGE_ORDER, applyClassificationJudgmentGuards, normalizeClassificationResult, QUEUES } from "@growvisi/shared";
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
import { ExecutionRouterService, type ExecutionRoute } from "../intelligence/execution-router.service";
import { FastReplyService } from "../intelligence/fast-reply.service";
import { ObservedMemoryService } from "../intelligence/observed-memory.service";
import type { DeferredCrmSync, PipelineContext } from "../intelligence/pipeline-context";
import {
  PipelineSpans,
  buildPipelineTurnMetrics,
  type PipelineTurnMetrics,
} from "../intelligence/pipeline-spans";
import { ReplyPolicyService } from "../intelligence/reply-policy.service";
import { ReplySafetyRailsService } from "../intelligence/reply-safety-rails.service";
import { ReplySendService } from "../intelligence/reply-send.service";
import { PostCloseAlertService } from "../intelligence/post-close-alert.service";
import { resolveReplyIntentKind } from "../intelligence/reply-intent";
import { readIntelligenceSettingsFromOrg, resolveIntelligenceSettings } from "../intelligence/workspace-intelligence-settings";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { useBackgroundWorkers } from "../../config/workers";
import { deferBackgroundTask } from "../../common/utils/defer-background";
import { withTimeout } from "../../common/utils/with-timeout";

export interface ClassifyJobData {
  organizationId: string;
  conversationId: string;
  messageId: string;
  leadId?: string;
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
  /** Skip outbound auto-send (latency probe, diagnostics). */
  dryRun?: boolean;
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
  private readonly inFlight = new Set<string>();

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
    private readonly safetyRails: ReplySafetyRailsService,
    private readonly executor: ActionExecutorService,
    private readonly executionRouter: ExecutionRouterService,
    private readonly fastReply: FastReplyService,
    private readonly replySend: ReplySendService,
    private readonly postCloseAlert: PostCloseAlertService,
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
    const spans = new PipelineSpans();
    const correlationId = data.correlationId ?? this.events.createCorrelationId();

    const claim = await this.claimTurn(data, spans);
    if (!claim) return;

    const { aiRunId } = claim;

    try {
      await this.entitlements.assertHasAccess(data.organizationId);

      const apiKey = this.config.get<string>("OPENAI_API_KEY");
      if (!apiKey) {
        this.logger.warn("OPENAI_API_KEY not set — skipping classification");
        return;
      }

      spans.mark("context_start");
      const ctx = await this.contextBuilder.buildForConversation(
        data.organizationId,
        data.conversationId,
      );
      spans.measure("context_build_ms", "context_start");

      if (!ctx.transcript.trim()) {
        await this.finalizeAiRun(aiRunId, { skipped: true, reason: "empty_transcript" }, 0);
        return;
      }

      const [prefs, org] = await Promise.all([
        this.automations.getPreferencesForOrg(data.organizationId),
        this.prisma.organization.findUnique({
          where: { id: data.organizationId },
          select: { name: true, settings: true },
        }),
      ]);

      const orgSettings =
        org?.settings && typeof org.settings === "object"
          ? (org.settings as Record<string, unknown>)
          : {};
      const intelligenceSettings = resolveIntelligenceSettings(orgSettings, org?.name ?? "our team");
      const businessName = org?.name ?? "our team";
      const businessProfile = intelligenceSettings.businessProfile!;

      const preRoute = this.executionRouter.routePreClassify(ctx);

      if (
        preRoute.path === "fast" &&
        intelligenceSettings.replyAutonomy === "auto_guarded" &&
        !data.refreshAfterCorrection &&
        !data.dryRun
      ) {
        const fastResult = await this.tryFastPathSend(data, ctx, {
          businessName,
          businessProfile,
          preRoute,
          spans,
          aiRunId,
          intelligenceSettings,
        });
        if (fastResult.sent) {
          await this.finalizeAiRun(aiRunId, {
            fastPath: true,
            executionPath: "fast",
            spans: spans.toJSON(),
          });
          await this.appendPipelineObservability(
            aiRunId,
            spans,
            buildPipelineTurnMetrics({
              executionPath: "fast",
              replyDecision: fastResult.replyDecision,
              knowledgeHits: [],
              knowledgeGap: false,
              stageChanged: false,
              safetyBlocked: fastResult.safetyBlocked,
              fastPath: true,
            }),
            0,
          );
          deferBackgroundTask(() =>
            this.runBackgroundClassifyOnly(data, ctx, {
              apiKey,
              prefs,
              businessName,
              preRoute,
            }),
          );
          this.deferPostCloseAlert(data.organizationId, data.conversationId);
          return;
        }
      }

      await this.runFullClassifyPipeline(data, ctx, {
        apiKey,
        prefs,
        businessName,
        businessProfile,
        intelligenceSettings,
        preRoute,
        spans,
        aiRunId,
        correlationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.prisma.aiRun.update({
        where: { id: aiRunId },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      });
      throw error;
    }
  }

  private async runFullClassifyPipeline(
    data: ClassifyJobData,
    ctx: Awaited<ReturnType<ContextBuilderService["buildForConversation"]>>,
    opts: {
      apiKey: string;
      prefs: Awaited<ReturnType<AutomationsService["getPreferencesForOrg"]>>;
      businessName: string;
      businessProfile: import("@growvisi/shared").BusinessEmployeeProfile;
      intelligenceSettings: ReturnType<typeof resolveIntelligenceSettings>;
      preRoute: ExecutionRoute;
      spans: PipelineSpans;
      aiRunId: string;
      correlationId: string;
    },
  ) {
    const model = this.config.get<string>("AI_CLASSIFY_MODEL") ?? "gpt-4o-mini";
    const classifyStarted = Date.now();

    opts.spans.mark("rag_start");
    const retrieval = await this.knowledge.retrieveDetailed({
      organizationId: data.organizationId,
      query: ctx.ragQuery,
      limit: 4,
      intentKind: opts.preRoute.intentKind,
      lastInbound: ctx.lastInbound,
    });
    const knowledgeHits = retrieval.hits;
    opts.spans.measure("rag_ms", "rag_start");

    const businessContext = this.knowledge.formatForPrompt(
      knowledgeHits,
      320,
      retrieval.categoriesUsed,
    );
    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
    const combinedContext = [businessContext, memoryBlock ? `Observed facts:\n${memoryBlock}` : ""]
      .filter(Boolean)
      .join("\n\n");

    opts.spans.mark("classify_llm_start");
    let result = await this.callOpenAi(
      opts.apiKey,
      model,
      ctx.lead.stage,
      ctx.transcript,
      ctx.lastInbound,
      combinedContext,
      data.humanFeedback,
    );
    opts.spans.measure("classify_llm_ms", "classify_llm_start");

    const knowledgeGap = this.planner.detectKnowledgeGap(ctx, knowledgeHits, {
      intentKind: resolveReplyIntentKind(ctx.lastInbound, result),
      classification: result,
      hasIndexedChunks: retrieval.hasIndexedChunks,
    });
    if (knowledgeGap) {
      result = this.planner.applyKnowledgeGapGuard(result, true);
    }
    result = applyClassificationJudgmentGuards(result);

    const executionRoute = this.executionRouter.refineAfterClassify(
      opts.preRoute,
      result,
      ctx,
    );

    const classifyLatencyMs = Date.now() - classifyStarted;
    await this.finalizeAiRun(opts.aiRunId, {
      ...result,
      executionPath: executionRoute.path,
      spans: { ...opts.spans.toJSON(), classify_llm_ms: classifyLatencyMs },
    }, classifyLatencyMs);

    const withinReplyWindow =
      !!ctx.conversation.lastInboundAt &&
      Date.now() - ctx.conversation.lastInboundAt.getTime() < 24 * 60 * 60 * 1000;

    let autoSendPlanOk = false;
    if (opts.intelligenceSettings.replyAutonomy === "auto_guarded") {
      try {
        await this.entitlements.assertPlanAtLeast(data.organizationId, "growth");
        autoSendPlanOk = true;
      } catch {
        autoSendPlanOk = false;
      }
    }

    const safetyCheck = await this.safetyRails.checkVelocity({
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      safety: opts.intelligenceSettings.safety,
    });
    const safetyBlocked = safetyCheck.blocked
      ? { code: safetyCheck.code!, reason: safetyCheck.reason! }
      : undefined;

    const updateStage =
      opts.prefs.stage &&
      !data.lockStage &&
      this.executor.shouldUpdateStage(ctx.lead.stage, result.stage, result.confidence);
    const stageChanged = updateStage;

    const score = this.executor.computeScore(
      result,
      Boolean(data.lockStage),
      ctx.lead.score,
    );

    if (knowledgeGap && score >= HOT_LEAD_SCORE_THRESHOLD) {
      result = {
        ...result,
        suggestedActions: [
          "Hot lead needs an answer — add Business Knowledge or reply in Inbox",
          ...(result.suggestedActions ?? []),
        ].slice(0, 3),
      };
    }

    const pipelineContext: PipelineContext = {
      ctx,
      knowledgeHits,
      businessName: opts.businessName,
      businessProfile: opts.businessProfile,
      knowledgeGap,
      executionRoute,
      spans: opts.spans,
      intelligenceSettings: opts.intelligenceSettings,
      hasIndexedChunks: retrieval.hasIndexedChunks,
      groundingConfidence: retrieval.groundingConfidence,
    };

    const { actions, replyDecision } = this.planner.buildFromClassification({
      ctx,
      result,
      knowledgeHits,
      aiRunId: opts.aiRunId,
      autoStageEnabled: opts.prefs.stage,
      lockStage: Boolean(data.lockStage),
      lockHandoff: Boolean(data.lockHandoff),
      stageChanged,
      score,
      handoffType: knowledgeGap ? "knowledge_gap" : "complex",
      workspaceAutonomy: opts.intelligenceSettings.replyAutonomy,
      intelligenceSettings: opts.intelligenceSettings,
      withinReplyWindow,
      autoSendPlanOk,
      executionPath: executionRoute.path,
      safetyBlocked,
      hasIndexedChunks: retrieval.hasIndexedChunks,
      groundingConfidence: retrieval.groundingConfidence,
      automationPrefs: {
        stage: opts.prefs.stage,
        notify: opts.prefs.notify,
        handoff: opts.prefs.handoff,
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
      entityId: data.leadId ?? ctx.leadId,
      correlationId: opts.correlationId,
      payload: {
        conversationId: data.conversationId,
        messageId: data.messageId,
        aiRunId: opts.aiRunId,
        executionPath: executionRoute.path,
      },
    });

    const planActions = data.dryRun
      ? actions.filter((a) => a.type !== "reply.send")
      : actions;

    opts.spans.mark("execute_plan_start");
    await this.executor.executePlan({
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      leadId: data.leadId ?? (ctx.hasLeadRecord ? ctx.leadId : undefined),
      correlationId: opts.correlationId,
      triggerEventId: event.eventId,
      classification: result,
      actions: planActions,
      ctx,
      stageChanged,
      pipelineContext,
    });
    opts.spans.measure("execute_plan_ms", "execute_plan_start");

    await this.appendPipelineObservability(
      opts.aiRunId,
      opts.spans,
      buildPipelineTurnMetrics({
        executionPath: executionRoute.path,
        replyDecision,
        knowledgeHits,
        knowledgeGap,
        stageChanged,
        safetyBlocked,
        fastPath: false,
        classification: result,
        groundingConfidence: retrieval.groundingConfidence,
      }),
      classifyLatencyMs,
    );

    deferBackgroundTask(() =>
      this.runDeferredCrmSync({
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        leadId: data.leadId ?? (ctx.hasLeadRecord ? ctx.leadId : undefined),
        result,
        ctx,
        aiRunId: opts.aiRunId,
        updateStage,
        lockStage: Boolean(data.lockStage),
        lockHandoff: Boolean(data.lockHandoff),
        stageChanged,
        score,
        knowledgeGap,
        correlationId: opts.correlationId,
        automationPrefs: {
          stage: opts.prefs.stage,
          notify: opts.prefs.notify,
          handoff: opts.prefs.handoff,
        },
      }),
    );

    this.deferPostCloseAlert(data.organizationId, data.conversationId);
  }

  private deferPostCloseAlert(organizationId: string, conversationId: string) {
    deferBackgroundTask(() =>
      this.postCloseAlert.maybeNotify({ organizationId, conversationId }),
    );
  }

  private async runBackgroundClassifyOnly(
    data: ClassifyJobData,
    ctx: Awaited<ReturnType<ContextBuilderService["buildForConversation"]>>,
    opts: {
      apiKey: string;
      prefs: Awaited<ReturnType<AutomationsService["getPreferencesForOrg"]>>;
      businessName: string;
      preRoute: ExecutionRoute;
    },
  ) {
    const model = this.config.get<string>("AI_CLASSIFY_MODEL") ?? "gpt-4o-mini";
    const retrieval = await this.knowledge.retrieveDetailed({
      organizationId: data.organizationId,
      query: ctx.ragQuery,
      limit: 4,
      intentKind: opts.preRoute.intentKind,
      lastInbound: ctx.lastInbound,
    });
    const knowledgeHits = retrieval.hits;
    const businessContext = this.knowledge.formatForPrompt(
      knowledgeHits,
      320,
      retrieval.categoriesUsed,
    );
    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
    const combinedContext = [businessContext, memoryBlock ? `Observed facts:\n${memoryBlock}` : ""]
      .filter(Boolean)
      .join("\n\n");

    let result = await this.callOpenAi(
      opts.apiKey,
      model,
      ctx.lead.stage,
      ctx.transcript,
      ctx.lastInbound,
      combinedContext,
      data.humanFeedback,
    );

    const knowledgeGap = this.planner.detectKnowledgeGap(ctx, knowledgeHits, {
      intentKind: resolveReplyIntentKind(ctx.lastInbound, result),
      classification: result,
      hasIndexedChunks: retrieval.hasIndexedChunks,
    });
    if (knowledgeGap) {
      result = this.planner.applyKnowledgeGapGuard(result, true);
    }
    result = applyClassificationJudgmentGuards(result);

    const bgRun = await this.prisma.aiRun.create({
      data: {
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        type: "classify",
        provider: "openai",
        model,
        status: "COMPLETED",
        input: { messageId: data.messageId, backgroundAfterFastPath: true },
        output: result as object,
        completedAt: new Date(),
      },
    });

    const updateStage =
      opts.prefs.stage &&
      !data.lockStage &&
      this.executor.shouldUpdateStage(ctx.lead.stage, result.stage, result.confidence);
    const stageChanged = updateStage;

    const score = this.executor.computeScore(
      result,
      Boolean(data.lockStage),
      ctx.lead.score,
    );

    await this.runDeferredCrmSync({
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      leadId: data.leadId ?? (ctx.hasLeadRecord ? ctx.leadId : undefined),
      result,
      ctx,
      aiRunId: bgRun.id,
      updateStage,
      lockStage: Boolean(data.lockStage),
      lockHandoff: Boolean(data.lockHandoff),
      stageChanged,
      score,
      knowledgeGap,
      correlationId: data.correlationId ?? "",
      automationPrefs: {
        stage: opts.prefs.stage,
        notify: opts.prefs.notify,
        handoff: opts.prefs.handoff,
      },
    });
  }

  private async tryFastPathSend(
    data: ClassifyJobData,
    ctx: Awaited<ReturnType<ContextBuilderService["buildForConversation"]>>,
    opts: {
      businessName: string;
      businessProfile: import("@growvisi/shared").BusinessEmployeeProfile;
      preRoute: ExecutionRoute;
      spans: PipelineSpans;
      aiRunId: string;
      intelligenceSettings: IntelligenceWorkspaceSettings;
    },
  ): Promise<
    | { sent: false }
    | {
        sent: true;
        replyDecision: ReplyDecision;
        safetyBlocked?: { code: string; reason: string };
      }
  > {
    const fastText = this.fastReply.compose(
      ctx.lastInbound,
      opts.businessName,
      ctx,
      opts.businessProfile,
    );
    if (!fastText) return { sent: false };

    const stub = this.stubClassification(ctx, opts.preRoute);
    const withinReplyWindow =
      !!ctx.conversation.lastInboundAt &&
      Date.now() - ctx.conversation.lastInboundAt.getTime() < 24 * 60 * 60 * 1000;

    let autoSendPlanOk = false;
    try {
      await this.entitlements.assertPlanAtLeast(data.organizationId, "growth");
      autoSendPlanOk = true;
    } catch {
      autoSendPlanOk = false;
    }

    const safetyCheck = await this.safetyRails.checkVelocity({
      organizationId: data.organizationId,
      conversationId: data.conversationId,
      safety: opts.intelligenceSettings.safety,
    });
    const safetyBlocked = safetyCheck.blocked
      ? { code: safetyCheck.code!, reason: safetyCheck.reason! }
      : undefined;

    const replyDecision = this.replyPolicy.evaluate({
      ctx,
      classification: stub,
      knowledgeHits: [],
      knowledgeGap: false,
      workspaceAutonomy: opts.intelligenceSettings.replyAutonomy,
      intelligenceSettings: opts.intelligenceSettings,
      withinReplyWindow,
      autoSendPlanOk,
      executionPath: opts.preRoute.path,
      safetyBlocked,
    });

    if (replyDecision.mode !== "send") {
      await this.replyPolicy.persistDecision(
        data.organizationId,
        data.conversationId,
        replyDecision,
      );
      return { sent: false };
    }

    const pipelineContext: PipelineContext = {
      ctx,
      knowledgeHits: [],
      businessName: opts.businessName,
      businessProfile: opts.businessProfile,
      knowledgeGap: false,
      executionRoute: opts.preRoute,
      spans: opts.spans,
      intelligenceSettings: opts.intelligenceSettings,
    };

    opts.spans.mark("fast_send_start");
    await this.replySend.sendGuardedAutoReply(data.organizationId, data.conversationId, {
      replyDecision,
      classification: stub,
      aiRunId: opts.aiRunId,
      pipelineContext,
      fastReplyText: fastText,
    });
    opts.spans.measure("fast_send_ms", "fast_send_start");

    await this.replyPolicy.persistDecision(
      data.organizationId,
      data.conversationId,
      replyDecision,
    );

    return { sent: true, replyDecision, safetyBlocked };
  }

  private async runDeferredCrmSync(sync: DeferredCrmSync) {
    if (!sync.ctx.hasLeadRecord || !sync.leadId) {
      await this.memory.syncFromClassification(sync.ctx, sync.result, sync.aiRunId);
      return;
    }

    try {
      const stageChanged = await this.executor.applyLeadProfileUpdate(
        sync.organizationId,
        sync.leadId,
        sync.result,
        {
          updateStage: sync.updateStage,
          preserveScore: sync.lockStage,
          currentStage: sync.ctx.lead.stage,
          currentScore: sync.ctx.lead.score,
          aiRunId: sync.aiRunId,
        },
      );

      await this.memory.syncFromClassification(sync.ctx, sync.result, sync.aiRunId);

      void this.automations.handlePostClassification({
        organizationId: sync.organizationId,
        conversationId: sync.conversationId,
        leadId: sync.leadId,
        leadName: sync.ctx.lead.displayName,
        leadPhone: sync.ctx.lead.phone,
        score: sync.score,
        stageChanged,
        newStage: sync.result.stage,
      });
    } catch (err) {
      this.logger.warn(
        `Deferred CRM sync failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private stubClassification(
    ctx: Awaited<ReturnType<ContextBuilderService["buildForConversation"]>>,
    route: ExecutionRoute,
  ): AiClassificationResult {
    return {
      stage: ctx.lead.stage,
      confidence: route.confidence,
      intent: route.intentKind === "thanks" ? "Thanks" : "Greeting",
      sentiment: "positive",
      suggestedActions: [],
      requiresHuman: false,
      tags: [],
    };
  }

  private async claimTurn(
    data: ClassifyJobData,
    spans: PipelineSpans,
  ): Promise<{ aiRunId: string } | null> {
    const key = `${data.organizationId}:${data.messageId}`;
    if (this.inFlight.has(key)) {
      this.logger.debug(`In-flight classify skipped for ${key}`);
      return null;
    }

    if (!data.refreshAfterCorrection) {
      if (await this.hasCompletedClassifyForMessage(
        data.organizationId,
        data.conversationId,
        data.messageId,
      )) {
        return null;
      }
      if (await this.hasRunningClassifyForMessage(
        data.organizationId,
        data.conversationId,
        data.messageId,
      )) {
        return null;
      }
    }

    this.inFlight.add(key);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;

        if (!data.refreshAfterCorrection) {
          const recent = await tx.aiRun.findMany({
            where: {
              organizationId: data.organizationId,
              conversationId: data.conversationId,
              type: { in: ["classify", "classify_refresh"] },
              status: { in: ["RUNNING", "COMPLETED"] },
              createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
            },
            select: { id: true, input: true },
            take: 20,
            orderBy: { createdAt: "desc" },
          });
          const duplicate = recent.some((run) => {
            const input = run.input as Record<string, unknown> | null;
            return input?.messageId === data.messageId;
          });
          if (duplicate) return null;
        }

        const aiRun = await tx.aiRun.create({
          data: {
            organizationId: data.organizationId,
            conversationId: data.conversationId,
            type: data.refreshAfterCorrection ? "classify_refresh" : "classify",
            provider: "openai",
            model: this.config.get<string>("AI_CLASSIFY_MODEL") ?? "gpt-4o-mini",
            status: "RUNNING",
            input: {
              messageId: data.messageId,
              leadId: data.leadId ?? null,
              humanFeedback: data.humanFeedback ?? null,
              claimedAt: new Date().toISOString(),
              spans: spans.toJSON(),
            },
          },
        });
        return { aiRunId: aiRun.id };
      });
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async appendPipelineObservability(
    aiRunId: string,
    spans: PipelineSpans,
    metrics: PipelineTurnMetrics,
    classifyLatencyMs: number,
  ) {
    const row = await this.prisma.aiRun.findUnique({
      where: { id: aiRunId },
      select: { output: true },
    });
    const prev =
      row?.output && typeof row.output === "object"
        ? (row.output as Record<string, unknown>)
        : {};

    await this.prisma.aiRun.update({
      where: { id: aiRunId },
      data: {
        output: {
          ...prev,
          spans: { ...spans.toJSON(), classify_llm_ms: classifyLatencyMs },
          metrics,
        } as object,
      },
    });
  }

  private async finalizeAiRun(
    aiRunId: string,
    output: Record<string, unknown>,
    latencyMs?: number,
  ) {
    await this.prisma.aiRun.update({
      where: { id: aiRunId },
      data: {
        status: "COMPLETED",
        output: output as object,
        latencyMs,
        completedAt: new Date(),
      },
    });
  }

  private async callOpenAi(
    apiKey: string,
    model: string,
    currentStage: LeadStage,
    transcript: string,
    lastInbound: string | null,
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
- customerNeeds: array of 1-4 distinct things the customer wants in their latest message(s) — split multi-part asks (e.g. price AND delivery AND EMI = 3 items)
- replyBrief: one sentence checklist for drafting the next reply (what must be addressed)
- language: "en" | "hi" | "hinglish" | "mixed" — language the customer is using
- entities: object with optional keys location, budget, product, quantity (only if mentioned)
- dealTemperature: "cold" | "warm" | "hot"
- unansweredFromCustomer: questions the customer asked that are not yet answered in the thread
- apologyRequired: true if customer is upset and deserves empathy first
- recoveryMode: true if we need to win back trust after a bad experience
- requiresOwner: true if only the business owner should handle (legal, large deal, angry VIP)
- buyingSignals: array of 0-3 short phrases showing purchase intent

Current pipeline stage: ${currentStage}.${contextBlock}${feedbackBlock}`,
            },
            {
              role: "user",
              content: `Classify this conversation. Weight the LATEST customer message most heavily for intent — earlier pricing context may still inform stage, but a bare greeting is not a new pricing inquiry.\n\n${transcript}\n\nLatest customer message: "${lastInbound ?? "(none)"}"`,
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

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const stage = this.normalizeStage(parsed.stage);
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));

    return normalizeClassificationResult(
      {
        stage,
        confidence,
        intent: String(parsed.intent ?? "General inquiry"),
        sentiment:
          parsed.sentiment === "positive" ||
          parsed.sentiment === "negative" ||
          parsed.sentiment === "neutral"
            ? parsed.sentiment
            : "neutral",
        suggestedActions: Array.isArray(parsed.suggestedActions)
          ? parsed.suggestedActions.map(String)
          : [],
        requiresHuman: Boolean(parsed.requiresHuman),
        summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 4) : [],
        nextAction:
          typeof parsed.nextAction === "string" ? parsed.nextAction.slice(0, 200) : undefined,
      },
      parsed,
    );
  }

  private async hasCompletedClassifyForMessage(
    organizationId: string,
    conversationId: string,
    messageId: string,
  ): Promise<boolean> {
    const recent = await this.prisma.aiRun.findMany({
      where: {
        organizationId,
        conversationId,
        type: { in: ["classify", "classify_refresh"] },
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { input: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    return recent.some((run) => {
      const input = run.input as Record<string, unknown> | null;
      return input?.messageId === messageId;
    });
  }

  private async hasRunningClassifyForMessage(
    organizationId: string,
    conversationId: string,
    messageId: string,
  ): Promise<boolean> {
    const running = await this.prisma.aiRun.findMany({
      where: {
        organizationId,
        conversationId,
        type: { in: ["classify", "classify_refresh"] },
        status: "RUNNING",
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { input: true },
      take: 5,
    });
    return running.some((run) => {
      const input = run.input as Record<string, unknown> | null;
      return input?.messageId === messageId;
    });
  }

  private normalizeStage(value: unknown): LeadStage {
    const stage = String(value ?? "NEW").toUpperCase() as LeadStage;
    return LEAD_STAGE_ORDER.includes(stage) ? stage : "NEW";
  }
}
