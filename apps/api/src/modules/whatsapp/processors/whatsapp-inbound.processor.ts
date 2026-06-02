import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "@revenue-os/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappService, type WhatsappWebhookPayload } from "../whatsapp.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";

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
  ) {
    super();
  }

  async process(job: Job<InboundJobData>) {
    const { webhookEventId, payload } = job.data;
    try {
      await this.whatsapp.processInboundPayload(payload);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { processedAt: new Date() },
      });

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const phoneNumberId = change.value.metadata?.phone_number_id;
          if (!phoneNumberId) continue;
          const account = await this.prisma.whatsappAccount.findFirst({
            where: { phoneNumberId },
          });
          if (account) {
            this.realtime.emitToOrganization(account.organizationId, "inbox.updated", {
              phoneNumberId,
            });
          }
        }
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
