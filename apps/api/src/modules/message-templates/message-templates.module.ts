import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { MessageTemplatesController } from "./message-templates.controller";
import { MessageTemplatesService } from "./message-templates.service";

@Module({
  imports: [BillingModule, WhatsappModule],
  controllers: [MessageTemplatesController],
  providers: [MessageTemplatesService, MembershipRoleGuard, SubscriptionGuard],
  exports: [MessageTemplatesService],
})
export class MessageTemplatesModule {}
