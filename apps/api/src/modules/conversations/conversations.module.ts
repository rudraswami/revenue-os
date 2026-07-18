import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { AiModule } from "../ai/ai.module";
import { BillingModule } from "../billing/billing.module";
import { EventsModule } from "../events/events.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [
    WhatsappModule,
    RealtimeModule,
    BillingModule,
    EventsModule,
    IntelligenceModule,
    AiModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, MembershipRoleGuard, SubscriptionGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}
