import { ForbiddenException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PLAN_LIMITS, resolveSubscriptionAccess, type GrowvisiPlanId, type SubscriptionAccess } from "@growvisi/shared";
import { metaReviewerEmail } from "../../config/meta-reviewer";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Meta App Review workspace — full Pro access, never trial-gated. */
  private async metaReviewerAccess(organizationId: string): Promise<SubscriptionAccess | null> {
    const reviewer = metaReviewerEmail();
    const owner = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        role: "OWNER",
        user: { email: reviewer },
      },
      select: { id: true },
    });
    if (!owner) return null;

    return {
      planId: "pro",
      limits: PLAN_LIMITS.pro,
      trialEndsAt: null,
      trialExpired: false,
      hasAccess: true,
      requiresUpgrade: false,
      status: "ACTIVE",
    };
  }

  async getAccess(organizationId: string): Promise<SubscriptionAccess> {
    const reviewerAccess = await this.metaReviewerAccess(organizationId);
    if (reviewerAccess) return reviewerAccess;

    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { createdAt: true },
      });
      return resolveSubscriptionAccess({
        planId: "trial",
        status: "TRIALING",
        createdAt: org?.createdAt ?? new Date(),
      });
    }
    return resolveSubscriptionAccess({
      planId: sub.planId,
      status: sub.status,
      createdAt: sub.createdAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    });
  }

  async assertHasAccess(organizationId: string): Promise<SubscriptionAccess> {
    const access = await this.getAccess(organizationId);
    if (!access.hasAccess) {
      throw new HttpException(
        {
          message:
            access.trialExpired
              ? "Your 14-day trial has ended. Upgrade to keep using Growvisi."
              : "Subscription inactive. Upgrade or update billing to continue.",
          code: access.trialExpired ? "TRIAL_EXPIRED" : "SUBSCRIPTION_INACTIVE",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return access;
  }

  async assertPlanAtLeast(
    organizationId: string,
    minimum: "growth" | "pro",
  ): Promise<SubscriptionAccess> {
    const access = await this.assertHasAccess(organizationId);
    const rank: Record<GrowvisiPlanId, number> = {
      trial: 0,
      starter: 1,
      growth: 2,
      pro: 3,
    };
    const minRank = minimum === "growth" ? 2 : 3;
    if (rank[access.planId] < minRank) {
      throw new ForbiddenException(
        `This feature requires the ${minimum === "growth" ? "Growth" : "Pro"} plan or higher.`,
      );
    }
    return access;
  }

  async assertCanAddWhatsappNumber(organizationId: string): Promise<void> {
    const access = await this.assertHasAccess(organizationId);
    const active = await this.prisma.whatsappAccount.count({
      where: { organizationId, isActive: true },
    });
    if (active >= access.limits.whatsappNumbers) {
      throw new ForbiddenException(
        `Your ${access.planId} plan allows ${access.limits.whatsappNumbers} WhatsApp number(s). Upgrade to add more.`,
      );
    }
  }

  async assertCanInviteMember(organizationId: string): Promise<void> {
    const access = await this.assertHasAccess(organizationId);
    const [members, pendingInvites] = await Promise.all([
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.prisma.organizationInvite.count({
        where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    if (members + pendingInvites >= access.limits.teamMembers) {
      throw new ForbiddenException(
        `Your ${access.planId} plan allows ${access.limits.teamMembers} team member(s). Upgrade to invite more.`,
      );
    }
  }

  /** Non-throwing monthly-lead cap check for webhook ingestion (never 500 a webhook). */
  async canCreateLead(organizationId: string): Promise<boolean> {
    const access = await this.getAccess(organizationId);
    if (!access.hasAccess) return false;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const used = await this.prisma.lead.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    });
    return used < access.limits.monthlyLeads;
  }

  async usageSnapshot(organizationId: string) {
    const access = await this.getAccess(organizationId);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [whatsappNumbers, teamMembers, monthlyLeads] = await Promise.all([
      this.prisma.whatsappAccount.count({ where: { organizationId, isActive: true } }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: monthStart } },
      }),
    ]);

    return {
      access,
      usage: {
        whatsappNumbers,
        teamMembers,
        monthlyLeads,
      },
      limits: access.limits,
    };
  }
}
