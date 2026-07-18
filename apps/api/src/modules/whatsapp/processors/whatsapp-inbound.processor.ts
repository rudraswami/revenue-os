import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DOMAIN_EVENTS, QUEUES } from "@growvisi/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AiClassifyService } from "../../ai/ai-classify.service";
import { BusinessEventService } from "../../events/business-event.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { WhatsappService, type WhatsappWebhookPayload } from "../whatsapp.service";

interface InboundJobData {
  webhookEventId: string;
  payload: WhatsappWebhookPayload;
}

@Processor(QUEUES.WHATSAPP_INBOUND)
export class WhatsappInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappInboundProcessor.name);

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly aiClassify: AiClassifyService,
    private readonly businessEvents: BusinessEventService,
  ) {
    super();
  }

  async process(job: Job<InboundJobData>) {
    const { webhookEventId, payload } = job.data;
    try {
      const events = await this.whatsapp.processWebhookPayload(payload);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { processedAt: new Date() },
      });

      const orgIds = new Set<string>();
      for (const event of events) {
        orgIds.add(event.organizationId);
        this.realtime.emitMessageNew(event.organizationId, {
          conversationId: event.conversationId,
        });

        const correlationId = this.businessEvents.createCorrelationId();
        void this.businessEvents.emit({
          organizationId: event.organizationId,
          type: DOMAIN_EVENTS.MESSAGE_RECEIVED,
          entityType: "message",
          entityId: event.messageId,
          correlationId,
          payload: {
            conversationId: event.conversationId,
            leadId: event.leadId,
            waMessageId: event.waMessageId,
            contactPhone: event.contactPhone,
          },
        });

        if (event.leadId) {
          await this.aiClassify.enqueue({
            organizationId: event.organizationId,
            conversationId: event.conversationId,
            messageId: event.messageId,
            leadId: event.leadId,
            correlationId,
          });
        }
      }
      for (const orgId of orgIds) {
        this.realtime.emitInboxUpdated(orgId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed processing webhook ${webhookEventId}: ${message}`);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { error: message },
      });
      throw error;
    }
  }
}
