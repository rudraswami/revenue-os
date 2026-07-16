import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { createHmac, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { normalizePaymentIntegration } from "../organizations/payment-integration";
import { LeadsService } from "./leads.service";

@SkipThrottle()
@Controller("webhooks/payments")
export class RazorpayPaymentWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
  ) {}

  @Post(":organizationId")
  async handle(
    @Param("organizationId") organizationId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    if (!org) {
      throw new BadRequestException("Unknown organization.");
    }

    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const integration = normalizePaymentIntegration(settings.paymentIntegration);
    if (!integration.razorpayWebhookSecret) {
      throw new BadRequestException("Payment webhooks are not configured for this workspace.");
    }

    const raw = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    if (!this.verifySignature(raw, signature, integration.razorpayWebhookSecret)) {
      throw new BadRequestException("Invalid Razorpay signature.");
    }

    const payload =
      typeof req.body === "object" && req.body
        ? (req.body as { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } })
        : JSON.parse(raw);

    if (payload.event !== "payment.captured") {
      return { handled: false, event: payload.event ?? null };
    }

    if (!integration.autoWinOnPayment) {
      return { handled: false, reason: "auto_win_disabled" };
    }

    const entity = payload.payload?.payment?.entity;
    if (!entity || typeof entity !== "object") {
      return { handled: false, reason: "missing_payment_entity" };
    }

    const notes =
      entity.notes && typeof entity.notes === "object"
        ? (entity.notes as Record<string, string>)
        : {};
    const leadId = typeof notes.leadId === "string" ? notes.leadId : undefined;
    const contact = typeof entity.contact === "string" ? entity.contact : undefined;
    const paymentId = typeof entity.id === "string" ? entity.id : "unknown";
    const amount =
      typeof entity.amount === "number" ? entity.amount : undefined;

    const result = await this.leads.markWonFromRazorpayPayment(organizationId, {
      leadId,
      phone: contact,
      paymentId,
      amountCents: amount,
    });

    return { handled: result.matched, ...result };
  }

  private verifySignature(body: string, signature: string | undefined, secret: string): boolean {
    if (!signature) return false;
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
