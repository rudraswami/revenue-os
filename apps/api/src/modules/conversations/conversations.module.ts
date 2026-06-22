import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [WhatsappModule, RealtimeModule, BillingModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
