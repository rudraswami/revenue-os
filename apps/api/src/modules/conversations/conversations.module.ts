import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { BillingModule } from "../billing/billing.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [WhatsappModule, RealtimeModule, BillingModule, KnowledgeModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, MembershipRoleGuard, SubscriptionGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}
