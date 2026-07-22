import { Module, forwardRef } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { AutomationsModule } from "../automations/automations.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { EmailVerifiedGuard } from "../../common/guards/email-verified.guard";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";
import { RazorpayPaymentWebhookController } from "./razorpay-payment-webhook.controller";

@Module({
  imports: [BillingModule, WebhooksModule, RealtimeModule, forwardRef(() => AutomationsModule)],
  controllers: [LeadsController, RazorpayPaymentWebhookController],
  providers: [LeadsService, MembershipRoleGuard, SubscriptionGuard, EmailVerifiedGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
