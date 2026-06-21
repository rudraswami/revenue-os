import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { GROWVISI_PLANS, type GrowvisiPlanId, PAID_PLAN_IDS } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RazorpayService } from "./razorpay.service";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  async getStatus(user: JwtPayload) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });
    const plan = GROWVISI_PLANS[(sub?.planId as GrowvisiPlanId) ?? "trial"];

    return {
      planId: sub?.planId ?? "trial",
      planName: plan.name,
      status: sub?.status ?? "TRIALING",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      razorpayConfigured: this.razorpay.isConfigured(),
      plans: this.razorpay.planCatalog(),
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

    await this.prisma.subscription.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        planId,
        status: "TRIALING",
        razorpayCustomerId: checkout.customerId,
        razorpaySubscriptionId: checkout.subscriptionId,
        razorpayPlanId: this.razorpay.planIdFor(planId as GrowvisiPlanId),
      },
      update: {
        planId,
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
    const planId = (entity.notes?.planId as GrowvisiPlanId | undefined) ?? (sub.planId as GrowvisiPlanId);

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: status as never,
        planId: status === "ACTIVE" || status === "TRIALING" ? planId : sub.planId,
        currentPeriodEnd: entity.current_end
          ? new Date(entity.current_end * 1000)
          : sub.currentPeriodEnd,
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
    if (status === "authenticated" || status === "created") return "TRIALING";
    return "TRIALING";
  }
}
