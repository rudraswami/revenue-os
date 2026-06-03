import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "@revenue-os/shared";
import { RealtimeModule } from "../realtime/realtime.module";
import { WhatsappWebhookController } from "./whatsapp-webhook.controller";
import { WhatsappInboundProcessor } from "./processors/whatsapp-inbound.processor";
import { WhatsappMessagingService } from "./whatsapp-messaging.service";
import { WhatsappService } from "./whatsapp.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WHATSAPP_INBOUND }),
    RealtimeModule,
  ],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappService, WhatsappMessagingService, WhatsappInboundProcessor],
  exports: [WhatsappService, WhatsappMessagingService],
})
export class WhatsappModule {}
