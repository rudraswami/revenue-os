import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "@growvisi/shared";
import { AiModule } from "../ai/ai.module";
import { AssignmentModule } from "../assignments/assignment.module";
import { TrackingModule } from "../tracking/tracking.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { BillingModule } from "../billing/billing.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WhatsappWebhookController } from "./whatsapp-webhook.controller";
import { WhatsappInboundProcessor } from "./processors/whatsapp-inbound.processor";
import { WhatsappMessagingService } from "./whatsapp-messaging.service";
import { WhatsappService } from "./whatsapp.service";

const isVercel = process.env.VERCEL === "1";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WHATSAPP_INBOUND }),
    RealtimeModule,
    AiModule,
    BillingModule,
    AssignmentModule,
    TrackingModule,
    WebhooksModule,
  ],
  controllers: [WhatsappWebhookController],
  providers: [
    WhatsappService,
    WhatsappMessagingService,
    ...(isVercel ? [] : [WhatsappInboundProcessor]),
  ],
  exports: [WhatsappService, WhatsappMessagingService],
})
export class WhatsappModule {}
