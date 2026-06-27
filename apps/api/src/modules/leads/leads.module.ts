import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";
import { RazorpayPaymentWebhookController } from "./razorpay-payment-webhook.controller";

@Module({
  imports: [BillingModule, WebhooksModule],
  controllers: [LeadsController, RazorpayPaymentWebhookController],
  providers: [LeadsService, MembershipRoleGuard, SubscriptionGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
