import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { useBackgroundWorkers } from "../../config/workers";
import { QUEUES } from "@growvisi/shared";
import { EventsModule } from "../events/events.module";
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

const registerProcessors = useBackgroundWorkers();

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WHATSAPP_INBOUND }),
    EventsModule,
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
    ...(registerProcessors ? [WhatsappInboundProcessor] : []),
  ],
  exports: [WhatsappService, WhatsappMessagingService],
})
export class WhatsappModule {}
