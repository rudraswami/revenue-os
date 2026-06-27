import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { GROWVISI_PLANS, type GrowvisiPlanId, PAID_PLAN_IDS } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EntitlementsService } from "./entitlements.service";
import { RazorpayService } from "./razorpay.service";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
  ) {}

  async getStatus(user: JwtPayload) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });
    const plan = GROWVISI_PLANS[(sub?.planId as GrowvisiPlanId) ?? "trial"];
    const snapshot = await this.entitlements.usageSnapshot(user.organizationId);

    return {
      planId: sub?.planId ?? "trial",
      planName: plan.name,
      status: sub?.status ?? "TRIALING",
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      razorpayConfigured: this.razorpay.isConfigured(),
      plans: this.razorpay.planCatalog(),
      entitlements: snapshot.access,
      usage: snapshot.usage,
      limits: snapshot.limits,
    };
  }

  async createCheckout(user: JwtPayload, planId: string) {
    if (!PAID_PLAN_IDS.includes(planId as (typeof PAID_PLAN_IDS)[number])) {
      throw new BadRequestException("Invalid plan.");
    }
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only workspace owners can manage billing.");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { email: true, name: true },
    });
    if (!dbUser) throw new NotFoundException();

    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });

    const checkout = await this.razorpay.createSubscription({
      planId: planId as GrowvisiPlanId,
      organizationId: user.organizationId,
      customerEmail: dbUser.email,
      customerName: dbUser.name,
      existingCustomerId: existing?.razorpayCustomerId,
    });

    // Do NOT switch planId/status here. The selected plan lives in the Razorpay
    // subscription `notes.planId` and is applied by the webhook once payment is
    // ACTIVE. Flipping planId to a paid tier while status is still TRIALING would
    // make `resolveSubscriptionAccess` return hasAccess=false and lock the user
    // out the moment they start paying. Keep them on trial until Razorpay confirms.
    await this.prisma.subscription.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        planId: "trial",
        status: "TRIALING",
        razorpayCustomerId: checkout.customerId,
        razorpaySubscriptionId: checkout.subscriptionId,
        razorpayPlanId: this.razorpay.planIdFor(planId as GrowvisiPlanId),
      },
      update: {
        razorpayCustomerId: checkout.customerId,
        razorpaySubscriptionId: checkout.subscriptionId,
        razorpayPlanId: this.razorpay.planIdFor(planId as GrowvisiPlanId),
      },
    });

    return {
      checkoutUrl: checkout.checkoutUrl,
      subscriptionId: checkout.subscriptionId,
    };
  }

  async cancelSubscription(user: JwtPayload) {
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only workspace owners can manage billing.");
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!sub?.razorpaySubscriptionId) {
      throw new BadRequestException("No active Razorpay subscription to cancel.");
    }
    if (sub.status === "CANCELED") {
      return { ok: true, message: "Subscription already canceled." };
    }
    if (sub.cancelAtPeriodEnd) {
      return {
        ok: true,
        message: "Cancellation already scheduled for the end of this billing period.",
      };
    }

    await this.razorpay.cancelSubscription(sub.razorpaySubscriptionId);
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });

    this.audit.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: "SETTINGS_CHANGE",
      resource: "subscription",
      resourceId: sub.id,
      metadata: { action: "cancel_at_period_end" },
    });

    return {
      ok: true,
      message: "Subscription canceled. Access continues until the current billing period ends.",
    };
  }

  async handleWebhook(payload: {
    event: string;
    payload?: {
      subscription?: {
        entity?: {
          id?: string;
          status?: string;
          current_end?: number;
          notes?: { organizationId?: string; planId?: string };
        };
      };
    };
  }) {
    const entity = payload.payload?.subscription?.entity;
    if (!entity?.id) return { handled: false };

    const sub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return { handled: false };

    const status = this.mapStatus(entity.status, payload.event);

    const notesPlanId = entity.notes?.planId as GrowvisiPlanId | undefined;
    const validNotesPlan =
      notesPlanId && PAID_PLAN_IDS.includes(notesPlanId as (typeof PAID_PLAN_IDS)[number])
        ? notesPlanId
        : undefined;

    const resolvedPlanId =
      status === "ACTIVE"
        ? validNotesPlan ?? sub.planId
        : sub.planId;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: status as never,
        planId: resolvedPlanId as string,
        currentPeriodEnd: entity.current_end
          ? new Date(entity.current_end * 1000)
          : sub.currentPeriodEnd,
        cancelAtPeriodEnd:
          status === "CANCELED" ? false : sub.cancelAtPeriodEnd,
      },
    });

    return { handled: true, status };
  }

  private mapStatus(razorpayStatus: string | undefined, event: string) {
    const status = (razorpayStatus ?? "").toLowerCase();
    if (event === "subscription.cancelled" || status === "cancelled") return "CANCELED";
    if (event === "subscription.halted" || status === "halted") return "PAST_DUE";
    if (status === "active" || event === "subscription.activated" || event === "subscription.charged") {
      return "ACTIVE";
    }
    if (status === "pending" || status === "paused") return "PAST_DUE";
    if (status === "expired") return "CANCELED";
    if (status === "authenticated" || status === "created") return "TRIALING";
    return "TRIALING";
  }
}
