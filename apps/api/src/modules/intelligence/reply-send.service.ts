import { Injectable, Logger } from "@nestjs/common";
import { DOMAIN_EVENTS, type ReplyDecision } from "@growvisi/shared";
import { BusinessEventService } from "../events/business-event.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import { LearningSignalService } from "./learning-signal.service";
import type { PipelineContext } from "./pipeline-context";
import { ReplyComposerService } from "./reply-composer.service";
import { ReplyPolicyService } from "./reply-policy.service";
import { ReplyTrustRailsService } from "./reply-trust-rails.service";
import { resolveReplyIntentKind } from "./reply-intent";
import { SuggestReplyService } from "./suggest-reply.service";

export type GuardedAutoReplyResult =
  | { sent: true; messageId: string; content: string; aiRunId?: string }
  | { sent: false; drafted: true; reason: string; blocker: string };

@Injectable()
export class ReplySendService {
  private readonly logger = new Logger(ReplySendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly composer: ReplyComposerService,
    private readonly whatsapp: WhatsappMessagingService,
    private readonly realtime: RealtimeGateway,
    private readonly events: BusinessEventService,
    private readonly learning: LearningSignalService,
    private readonly suggestReply: SuggestReplyService,
    private readonly trustRails: ReplyTrustRailsService,
    private readonly replyPolicy: ReplyPolicyService,
  ) {}

  async sendGuardedAutoReply(
    organizationId: string,
    conversationId: string,
    opts: {
      replyDecision: ReplyDecision;
      knowledgeGap?: boolean;
      aiRunId?: string;
      classification?: import("@growvisi/shared").AiClassificationResult | null;
      pipelineContext?: PipelineContext;
      fastReplyText?: string;
    },
  ): Promise<GuardedAutoReplyResult> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { whatsappAccount: true },
    });
    if (!conversation?.whatsappAccount?.isActive) {
      throw new Error("WhatsApp account not active");
    }

    opts.pipelineContext?.spans?.mark("reply_send_start");

    const composed = await this.composer.compose({
      organizationId,
      conversationId,
      decision: opts.replyDecision,
      knowledgeGap: opts.knowledgeGap,
      classification: opts.classification,
      pipelineContext: opts.pipelineContext,
      fastReplyText: opts.fastReplyText,
    });

    opts.pipelineContext?.spans?.measure("compose_in_send_ms", "reply_send_start");

    const intentKind = resolveReplyIntentKind(
      opts.pipelineContext?.ctx.lastInbound ?? null,
      opts.classification ?? null,
    );

    const trust = this.trustRails.validatePostCompose({
      text: composed.suggestion,
      sources: composed.sources,
      isFastPath: Boolean(opts.fastReplyText?.trim()),
      intentKind,
      automationPreset: this.readAutomationPreset(opts.pipelineContext),
    });

    if (!trust.allowed) {
      const downgraded: ReplyDecision = {
        ...opts.replyDecision,
        mode: "draft",
        risk: "medium",
        reasons: [
          trust.reason ?? "Trust rail blocked auto-send.",
          ...opts.replyDecision.reasons.filter((r) => r !== trust.reason),
        ].slice(0, 5),
        blockers: [
          ...(opts.replyDecision.blockers ?? []),
          trust.blocker ?? "compose_grounding",
        ].filter((b, i, arr) => arr.indexOf(b) === i),
        autoEligible: false,
        evaluatedAt: new Date().toISOString(),
      };

      await this.replyPolicy.persistDecision(organizationId, conversationId, downgraded);
      await this.suggestReply.storeComposedDraft(
        organizationId,
        conversationId,
        {
          suggestion: composed.suggestion,
          sources: composed.sources,
          aiRunId: composed.aiRunId,
        },
        downgraded,
      );

      this.realtime.emitInboxUpdated(organizationId, conversationId);
      this.logger.warn(
        `Trust rail blocked auto-send for ${conversationId}: ${trust.blocker}`,
      );

      void this.learning.recordTrustRailBlock({
        organizationId,
        conversationId,
        aiRunId: opts.aiRunId,
        blocker: trust.blocker ?? "compose_grounding",
        reason: trust.reason,
        intentKind,
      });

      return {
        sent: false,
        drafted: true,
        reason: trust.reason ?? "Draft for review.",
        blocker: trust.blocker ?? "compose_grounding",
      };
    }

    // Coverage gate: the composer returns a structured answer contract. Only
    // auto-send when the model self-reports it fully answered with adequate
    // confidence and no human is needed. Otherwise the composed text is still a
    // strong draft — persist it for one-tap human review instead of sending a
    // half-answer. Fast-path courtesy replies have no contract, so they pass.
    const coverage = this.evaluateAnswerContract(composed);
    if (coverage.block) {
      const downgraded: ReplyDecision = {
        ...opts.replyDecision,
        mode: "draft",
        risk: "medium",
        reasons: [coverage.reason, ...opts.replyDecision.reasons].slice(0, 5),
        blockers: [
          ...(opts.replyDecision.blockers ?? []),
          coverage.blocker,
        ].filter((b, i, arr) => arr.indexOf(b) === i),
        autoEligible: false,
        evaluatedAt: new Date().toISOString(),
      };

      await this.replyPolicy.persistDecision(organizationId, conversationId, downgraded);
      await this.suggestReply.storeComposedDraft(
        organizationId,
        conversationId,
        {
          suggestion: composed.suggestion,
          sources: composed.sources,
          aiRunId: composed.aiRunId,
        },
        downgraded,
      );

      this.realtime.emitInboxUpdated(organizationId, conversationId);
      this.logger.log(
        `Coverage gate held auto-send for ${conversationId}: ${coverage.blocker}`,
      );

      void this.learning.recordTrustRailBlock({
        organizationId,
        conversationId,
        aiRunId: composed.aiRunId ?? opts.aiRunId,
        blocker: coverage.blocker,
        reason: coverage.reason,
        intentKind,
      });

      return {
        sent: false,
        drafted: true,
        reason: coverage.reason,
        blocker: coverage.blocker,
      };
    }

    const waMessageId = await this.whatsapp.sendText(
      conversation.whatsappAccount,
      conversation.contactPhone,
      composed.suggestion,
    );

    opts.pipelineContext?.spans?.measure("whatsapp_send_ms", "reply_send_start");

    const message = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId,
        waMessageId,
        direction: "OUTBOUND",
        type: "TEXT",
        status: "SENT",
        content: composed.suggestion,
        sentByAi: true,
      },
    });

    const meta =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};

    const { pendingDraft: _removed, ...restMeta } = meta;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        metadata: {
          ...restMeta,
          replyDecision: opts.replyDecision,
          lastAiAutoReplyAt: new Date().toISOString(),
          lastAiAutoReplyPreview: composed.suggestion.slice(0, 160),
          lastAiAutoReplyMessageId: message.id,
        } as object,
      },
    });

    await this.suggestReply.clearPendingDraft(conversationId, organizationId);

    void this.learning.recordAutoSend({
      organizationId,
      conversationId,
      aiRunId: composed.aiRunId ?? opts.aiRunId,
      preview: composed.suggestion.slice(0, 200),
      intent: opts.classification?.intent,
    });

    this.realtime.emitMessageNew(organizationId, {
      conversationId,
      messageId: message.id,
      direction: "OUTBOUND",
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      type: "TEXT",
    });
    this.realtime.emitInboxUpdated(organizationId, conversationId);

    void this.events.emit({
      organizationId,
      type: DOMAIN_EVENTS.MESSAGE_SENT,
      entityType: "message",
      entityId: message.id,
      payload: {
        conversationId,
        content: composed.suggestion,
        sentByAi: true,
        aiRunId: composed.aiRunId,
      },
    });

    this.logger.log(`Guarded auto-reply sent for conversation ${conversationId}`);

    return {
      sent: true,
      messageId: message.id,
      content: composed.suggestion,
      aiRunId: composed.aiRunId,
    };
  }

  /**
   * Decide whether the composed reply is complete enough to auto-send, based on
   * the model's structured self-report. Conservative by design: if the model
   * says it needs a human or didn't answer everything, we hold for review.
   */
  private evaluateAnswerContract(composed: {
    answeredEverything?: boolean;
    selfConfidence?: number;
    needsHuman?: boolean;
  }): { block: boolean; reason: string; blocker: string } {
    const pass = { block: false, reason: "", blocker: "" };

    if (composed.needsHuman === true) {
      return {
        block: true,
        reason: "AI flagged this needs a human — draft ready for review.",
        blocker: "needs_human",
      };
    }
    if (composed.answeredEverything === false) {
      return {
        block: true,
        reason: "AI could not fully answer — draft ready for review.",
        blocker: "incomplete_answer",
      };
    }
    if (
      typeof composed.selfConfidence === "number" &&
      composed.selfConfidence < 0.5
    ) {
      return {
        block: true,
        reason: "AI confidence below auto-send threshold — draft ready for review.",
        blocker: "low_self_confidence",
      };
    }

    return pass;
  }

  private readAutomationPreset(
    pipelineContext?: PipelineContext,
  ): import("@growvisi/shared").AutomationPolicyPreset | undefined {
    const settings = pipelineContext?.intelligenceSettings;
    return settings?.automationPreset;
  }
}
