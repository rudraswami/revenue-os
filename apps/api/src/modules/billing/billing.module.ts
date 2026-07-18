import { Module } from "@nestjs/common";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { EmailVerifiedGuard } from "../../common/guards/email-verified.guard";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { EntitlementsService } from "./entitlements.service";
import { RazorpayService } from "./razorpay.service";
import { RazorpayWebhookController } from "./razorpay-webhook.controller";

@Module({
  controllers: [BillingController, RazorpayWebhookController],
  providers: [BillingService, RazorpayService, EntitlementsService, SubscriptionGuard, EmailVerifiedGuard],
  exports: [BillingService, RazorpayService, EntitlementsService, SubscriptionGuard],
})
export class BillingModule {}
