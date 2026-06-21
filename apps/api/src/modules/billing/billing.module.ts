import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { RazorpayService } from "./razorpay.service";
import { RazorpayWebhookController } from "./razorpay-webhook.controller";

@Module({
  controllers: [BillingController, RazorpayWebhookController],
  providers: [BillingService, RazorpayService],
  exports: [BillingService, RazorpayService],
})
export class BillingModule {}
