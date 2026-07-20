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
      await this.suggestReply.generateAndStoreDraft(organizationId, conversationId, {
        knowledgeGap: opts.knowledgeGap,
        decision: downgraded,
        classification: opts.classification,
        pipelineContext: opts.pipelineContext,
      });

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

  private readAutomationPreset(
    pipelineContext?: PipelineContext,
  ): import("@growvisi/shared").AutomationPolicyPreset | undefined {
    const settings = pipelineContext?.intelligenceSettings;
    return settings?.automationPreset;
  }
}
