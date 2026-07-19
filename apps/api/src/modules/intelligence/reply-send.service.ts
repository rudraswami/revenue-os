import { Injectable, Logger } from "@nestjs/common";
import { DOMAIN_EVENTS, type ReplyDecision } from "@growvisi/shared";
import { BusinessEventService } from "../events/business-event.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import { LearningSignalService } from "./learning-signal.service";
import type { PipelineContext } from "./pipeline-context";
import { ReplyComposerService } from "./reply-composer.service";
import { SuggestReplyService } from "./suggest-reply.service";

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
  ) {
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

    this.realtime.emitMessageNew(organizationId, { conversationId });
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
      messageId: message.id,
      content: composed.suggestion,
      aiRunId: composed.aiRunId,
    };
  }
}
