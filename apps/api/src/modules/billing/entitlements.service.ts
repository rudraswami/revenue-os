import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PLAN_LIMITS, resolveSubscriptionAccess, type GrowvisiPlanId, type SubscriptionAccess } from "@growvisi/shared";
import { isProductionDeploy } from "../../config/production";
import { metaReviewerEmail } from "../../config/meta-reviewer";
import { PrismaService } from "../prisma/prisma.service";

export type LimitReason = "seats" | "whatsapp" | "leads" | "agency_clients";

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Meta App Review workspace — full Pro access when explicitly enabled.
   * In production, requires META_REVIEWER_BYPASS=true so a leaked demo password
   * cannot permanently unlock Pro.
   */
  private async metaReviewerAccess(organizationId: string): Promise<SubscriptionAccess | null> {
    if (isProductionDeploy() && process.env.META_REVIEWER_BYPASS !== "true") {
      return null;
    }

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

  /** Next plan that raises the constrained resource (INR / Razorpay path). */
  suggestUpgrade(planId: GrowvisiPlanId, reason: LimitReason): GrowvisiPlanId {
    if (planId === "pro") return "pro";
    if (reason === "agency_clients") return "pro";
    if (reason === "whatsapp") {
      if (planId === "trial" || planId === "starter") return "growth";
      return "pro";
    }
    if (reason === "seats") {
      if (planId === "trial" || planId === "starter") return "growth";
      return "pro";
    }
    // leads
    if (planId === "trial") return "starter";
    if (planId === "starter" || planId === "growth") return "pro";
    return "pro";
  }

  private throwCapacityLimit(opts: {
    code: string;
    message: string;
    reason: LimitReason;
    limit: number;
    used: number;
    planId: GrowvisiPlanId;
  }): never {
    throw new HttpException(
      {
        message: opts.message,
        code: opts.code,
        reason: opts.reason,
        limit: opts.limit,
        used: opts.used,
        planId: opts.planId,
        suggestedPlan: this.suggestUpgrade(opts.planId, opts.reason),
      },
      HttpStatus.FORBIDDEN,
    );
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
          reason: "trial",
          planId: access.planId,
          suggestedPlan: this.suggestUpgrade(access.planId, "leads"),
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
      throw new HttpException(
        {
          message: `This feature requires the ${minimum === "growth" ? "Growth" : "Pro"} plan or higher.`,
          code: "PLAN_FEATURE_REQUIRED",
          reason: minimum === "pro" ? "agency_clients" : "whatsapp",
          planId: access.planId,
          suggestedPlan: minimum,
          limit: null,
          used: null,
        },
        HttpStatus.FORBIDDEN,
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
      this.throwCapacityLimit({
        code: "WHATSAPP_NUMBER_LIMIT",
        message: `Your ${access.planId} plan allows ${access.limits.whatsappNumbers} WhatsApp number(s). Upgrade to add more.`,
        reason: "whatsapp",
        limit: access.limits.whatsappNumbers,
        used: active,
        planId: access.planId,
      });
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
    const used = members + pendingInvites;
    if (used >= access.limits.teamMembers) {
      this.throwCapacityLimit({
        code: "TEAM_SEAT_LIMIT",
        message: `Your ${access.planId} plan allows ${access.limits.teamMembers} team member(s). Upgrade to invite more.`,
        reason: "seats",
        limit: access.limits.teamMembers,
        used,
        planId: access.planId,
      });
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

  /** Increment when webhook ingest stores a message but skips new lead creation. */
  async recordLeadIngestionSkipped(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    if (!org) return;

    const settings =
      org.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {};
    const prev =
      settings.leadCap && typeof settings.leadCap === "object"
        ? (settings.leadCap as Record<string, unknown>)
        : {};
    const monthKey = this.currentUtcMonthKey();
    const skippedThisMonth =
      prev.monthKey === monthKey && typeof prev.skippedThisMonth === "number"
        ? prev.skippedThisMonth + 1
        : 1;

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          leadCap: {
            monthKey,
            skippedThisMonth,
            lastSkippedAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  async leadCapIngestionSignal(organizationId: string): Promise<{ skippedThisMonth: number }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings =
      org?.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {};
    const cap =
      settings.leadCap && typeof settings.leadCap === "object"
        ? (settings.leadCap as Record<string, unknown>)
        : {};
    const monthKey = this.currentUtcMonthKey();
    return {
      skippedThisMonth:
        cap.monthKey === monthKey && typeof cap.skippedThisMonth === "number"
          ? cap.skippedThisMonth
          : 0,
    };
  }

  private currentUtcMonthKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  /** Throwing check for dashboard actions (add contact / outbound). */
  async assertCanCreateLead(organizationId: string): Promise<void> {
    const access = await this.assertHasAccess(organizationId);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const used = await this.prisma.lead.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    });
    if (used >= access.limits.monthlyLeads) {
      this.throwCapacityLimit({
        code: "LEAD_MONTHLY_LIMIT",
        message: `You've used ${used} of ${access.limits.monthlyLeads} leads this month on ${access.planId}. Upgrade for more capacity.`,
        reason: "leads",
        limit: access.limits.monthlyLeads,
        used,
        planId: access.planId,
      });
    }
  }

  async usageSnapshot(organizationId: string) {
    const access = await this.getAccess(organizationId);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [whatsappNumbers, teamMembers, monthlyLeads, agencyClients] = await Promise.all([
      this.prisma.whatsappAccount.count({ where: { organizationId, isActive: true } }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: monthStart } },
      }),
      this.prisma.agencyClient.count({ where: { agencyOrganizationId: organizationId } }),
    ]);

    const usage = {
      whatsappNumbers,
      teamMembers,
      monthlyLeads,
      agencyClients,
    };
    const limits = access.limits;

    const seatsAtLimit = teamMembers >= limits.teamMembers;
    const whatsappAtLimit = whatsappNumbers >= limits.whatsappNumbers;
    const leadsAtLimit = monthlyLeads >= limits.monthlyLeads;
    const agencyAtLimit = limits.agencyClients > 0 && agencyClients >= limits.agencyClients;

    const primaryReason: LimitReason | null = seatsAtLimit
      ? "seats"
      : whatsappAtLimit
        ? "whatsapp"
        : leadsAtLimit
          ? "leads"
          : agencyAtLimit
            ? "agency_clients"
            : null;

    return {
      access,
      usage,
      limits,
      friction: {
        seatsAtLimit,
        whatsappAtLimit,
        leadsAtLimit,
        agencyAtLimit,
        nearLimit:
          teamMembers / Math.max(limits.teamMembers, 1) >= 0.85 ||
          whatsappNumbers / Math.max(limits.whatsappNumbers, 1) >= 0.85 ||
          monthlyLeads / Math.max(limits.monthlyLeads, 1) >= 0.85,
        primaryReason,
        suggestedPlan: primaryReason
          ? this.suggestUpgrade(access.planId, primaryReason)
          : null,
      },
    };
  }
}
