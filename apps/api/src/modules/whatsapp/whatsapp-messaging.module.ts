import { Module } from "@nestjs/common";
import { WhatsappMessagingService } from "./whatsapp-messaging.service";

/** Messaging-only slice — avoids importing AiModule via WhatsappModule. */
@Module({
  providers: [WhatsappMessagingService],
  exports: [WhatsappMessagingService],
})
export class WhatsappMessagingModule {}
