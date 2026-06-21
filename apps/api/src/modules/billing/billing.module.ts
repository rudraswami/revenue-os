import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { EntitlementsService } from "./entitlements.service";
import { RazorpayService } from "./razorpay.service";
import { RazorpayWebhookController } from "./razorpay-webhook.controller";

@Module({
  controllers: [BillingController, RazorpayWebhookController],
  providers: [BillingService, RazorpayService, EntitlementsService],
  exports: [BillingService, RazorpayService, EntitlementsService],
})
export class BillingModule {}
