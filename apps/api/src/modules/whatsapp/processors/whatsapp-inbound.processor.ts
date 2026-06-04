import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "@growthsync/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { WhatsappService, type WhatsappWebhookPayload } from "../whatsapp.service";
import { AiClassifyService } from "../../ai/ai-classify.service";

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
  ) {
    super();
  }

  async process(job: Job<InboundJobData>) {
    const { webhookEventId, payload } = job.data;
    try {
      const events = await this.whatsapp.processInboundPayload(payload);
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
        await this.aiClassify.enqueue(event);
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
