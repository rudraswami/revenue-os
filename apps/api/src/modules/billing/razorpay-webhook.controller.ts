import { BadRequestException, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { BillingService } from "./billing.service";
import { RazorpayService } from "./razorpay.service";

@SkipThrottle()
@Controller("webhooks/razorpay")
export class RazorpayWebhookController {
  constructor(
    private readonly billing: BillingService,
    private readonly razorpay: RazorpayService,
  ) {}

  @Get()
  health() {
    return {
      ok: true,
      service: "growvisi-razorpay-webhook",
      method: "POST",
      note: "Razorpay delivers subscription events via POST with X-Razorpay-Signature.",
    };
  }

  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    const raw = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    if (!this.razorpay.verifyWebhookSignature(raw, signature)) {
      throw new BadRequestException("Invalid Razorpay signature");
    }

    const payload = typeof req.body === "object" && req.body ? req.body : JSON.parse(raw);
    return this.billing.handleWebhook(payload as { event: string });
  }
}
