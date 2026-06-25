import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { BillingModule } from "../billing/billing.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [WhatsappModule, RealtimeModule, BillingModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, MembershipRoleGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}
