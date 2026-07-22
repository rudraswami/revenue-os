import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import type { JwtPayload, MembershipRole } from "@growvisi/shared";
import {
  canInviteRole,
  getIndustryHandbook,
  isIndustryHandbookId,
  listIndustryHandbooks,
  mergeIndustryHandbookProfile,
} from "@growvisi/shared";
import { GROWVISI_WEB_URL, activationAllComplete, activationNextMilestone, buildActivationFunnelMetrics, buildPostActivationCoaching } from "@growvisi/shared";
import { AuthService } from "../auth/auth.service";
import { AgencyService } from "../agency/agency.service";
import { BillingService } from "../billing/billing.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ServerCacheService } from "../server-cache/server-cache.service";
import {
  SERVER_CACHE_TTL,
  onboardingCacheKey,
  shellBootstrapCacheKey,
} from "../server-cache/server-cache.keys";
import { normalizePaymentIntegration } from "./payment-integration";
import { mergeCoachingSettings, normalizeWorkspaceOpsSettings } from "./workspace-settings";
import {
  normalizeIntelligenceSettings,
  readIntelligenceSettingsFromOrg,
  resolveIntelligenceSettings,
} from "../intelligence/workspace-intelligence-settings";
import type { IntelligenceWorkspaceSettings, IntelligenceWorkspaceSettingsPatch } from "@growvisi/shared";

export interface ReplyTemplate {
  id: string;
  title: string;
  body: string;
}

const DEFAULT_REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: "thanks",
    title: "Thanks for reaching out",
    body: "Hi! Thanks for messaging us. How can we help you today?",
  },
  {
    id: "follow-up",
    title: "Following up",
    body: "Hi! Just checking in — did you have any questions about our offer?",
  },
  {
    id: "pricing",
    title: "Share pricing",
    body: "Happy to share pricing details. What package or quantity are you looking at?",
  },
];

function normalizeTemplates(raw: unknown): ReplyTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_REPLY_TEMPLATES;
  const parsed = raw
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const item = t as { id?: string; title?: string; body?: string };
      return {
        id: item.id?.trim() || randomBytes(6).toString("hex"),
        title: String(item.title ?? "").trim(),
        body: String(item.body ?? "").trim(),
      };
    })
    .filter((t) => t.title && t.body);
  return parsed.length > 0 ? parsed : DEFAULT_REPLY_TEMPLATES;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly auth: AuthService,
    private readonly billing: BillingService,
    private readonly agency: AgencyService,
    private readonly whatsappAccounts: WhatsappAccountsService,
    private readonly knowledgeRetrieval: KnowledgeRetrievalService,
    private readonly knowledge: KnowledgeService,
    private readonly serverCache: ServerCacheService,
  ) {}

  async getCurrent(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            conversations: true,
            leads: true,
          },
        },
      },
    });
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  async listMembers(user: JwtPayload) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true, lastLoginAt: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  async getReplyTemplates(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    return { templates: normalizeTemplates(settings.replyTemplates) };
  }

  async getIntelligenceSettings(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true, name: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    return resolveIntelligenceSettings(settings, org.name);
  }

  async updateIntelligenceSettings(
    user: JwtPayload,
    patch: IntelligenceWorkspaceSettingsPatch,
  ) {
    this.assertAdmin(user);
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true, name: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const current = resolveIntelligenceSettings(settings, org.name);

    if (patch.automationPreset === "responsive") {
      const health = await this.knowledgeRetrieval.getHealth(user.organizationId);
      if (!health.readyForResponsivePreset) {
        throw new BadRequestException(
          "Upload and index Business Knowledge before enabling the Responsive preset.",
        );
      }
    }

    if (patch.replyAutonomy === "auto_guarded") {
      await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    }

    const mergedProfile = patch.businessProfile
      ? {
          ...current.businessProfile,
          ...patch.businessProfile,
          voice: { ...current.businessProfile?.voice, ...patch.businessProfile.voice },
          language: { ...current.businessProfile?.language, ...patch.businessProfile.language },
          escalation: {
            ...current.businessProfile?.escalation,
            ...patch.businessProfile.escalation,
          },
          closeActions: {
            ...current.businessProfile?.closeActions,
            ...patch.businessProfile.closeActions,
          },
          greetingVariants: {
            ...current.businessProfile?.greetingVariants,
            ...patch.businessProfile.greetingVariants,
          },
        }
      : current.businessProfile;
    const next = resolveIntelligenceSettings(
      {
        intelligence: {
          ...current,
          ...patch,
          businessProfile: mergedProfile,
        },
      },
      org.name,
    );
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          intelligence: next,
        } as object,
      },
    });
    return next;
  }

  listIndustryHandbooks() {
    return listIndustryHandbooks();
  }

  async applyIndustryHandbook(
    user: JwtPayload,
    industryId: string,
    opts?: { seedKnowledge?: boolean },
  ) {
    this.assertAdmin(user);
    if (!isIndustryHandbookId(industryId)) {
      throw new BadRequestException("Unknown industry handbook.");
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true, name: true },
    });
    if (!org) throw new NotFoundException("Organization not found");

    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const current = resolveIntelligenceSettings(settings, org.name);
    const handbook = getIndustryHandbook(industryId);
    const businessProfile = mergeIndustryHandbookProfile(
      org.name,
      industryId,
      current.businessProfile,
    );

    const next = resolveIntelligenceSettings(
      {
        intelligence: {
          ...current,
          industryId,
          businessProfile,
        },
      },
      org.name,
    );

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          intelligence: next,
        } as object,
      },
    });

    let knowledgeDocsCreated = 0;
    if (opts?.seedKnowledge !== false) {
      for (const seed of handbook.knowledgeSeeds) {
        const existing = await this.prisma.knowledgeDocument.findFirst({
          where: {
            organizationId: user.organizationId,
            title: seed.title,
          },
        });
        if (existing) continue;
        const doc = await this.prisma.knowledgeDocument.create({
          data: {
            organizationId: user.organizationId,
            title: seed.title,
            category: seed.category,
            sourceType: "industry_handbook",
            rawContent: seed.content,
            status: "pending",
          },
        });
        await this.knowledge.scheduleDocumentEmbed(doc.id, user.organizationId);
        knowledgeDocsCreated += 1;
      }
      if (knowledgeDocsCreated > 0) {
        this.knowledgeRetrieval.invalidateChunkCountCache(user.organizationId);
      }
    }

    return {
      intelligence: next,
      industryId,
      knowledgeDocsCreated,
      message:
        knowledgeDocsCreated > 0
          ? `Applied ${handbook.label} handbook. ${knowledgeDocsCreated} knowledge doc(s) queued for indexing.`
          : `Applied ${handbook.label} employee handbook.`,
    };
  }

  async updateReplyTemplates(
    user: JwtPayload,
    templates?: Array<{ id?: string; title: string; body: string }>,
  ) {
    this.assertAdmin(user);
    const normalized = normalizeTemplates(templates);
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          replyTemplates: normalized as unknown as object,
        },
      },
    });
    return { templates: normalized };
  }

  async listInvites(user: JwtPayload) {
    this.assertCanManageInvites(user);
    return this.prisma.organizationInvite.findMany({
      where: { organizationId: user.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { name: true, email: true } },
      },
    });
  }

  async revokeInvite(user: JwtPayload, inviteId: string) {
    this.assertCanManageInvites(user);
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { id: inviteId, organizationId: user.organizationId, acceptedAt: null },
    });
    if (!invite) throw new NotFoundException("Invite not found.");
    if (!canInviteRole(user.role, invite.role)) {
      throw new ForbiddenException("You cannot revoke this invite.");
    }
    await this.prisma.organizationInvite.delete({ where: { id: inviteId } });
    return { ok: true };
  }

  async updateMemberRole(user: JwtPayload, memberId: string, role: MembershipRole) {
    this.assertAdmin(user);
    if (role === "OWNER") {
      throw new BadRequestException("Transfer ownership is not supported yet.");
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    });
    if (!member) throw new NotFoundException("Member not found.");
    if (member.role === "OWNER" && user.role !== "OWNER") {
      throw new ForbiddenException("Only the owner can change another owner's role.");
    }
    if (member.userId === user.sub && role !== member.role) {
      throw new BadRequestException("You cannot change your own role.");
    }

    await this.serverCache.invalidateMembership(member.userId, user.organizationId);
    void this.serverCache.invalidateShellBootstrap(user.organizationId);

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true, lastLoginAt: true } },
      },
    });
    await this.serverCache.invalidateMembership(updated.userId, user.organizationId);
    void this.serverCache.invalidateShellBootstrap(user.organizationId);
    return updated;
  }

  async removeMember(user: JwtPayload, memberId: string) {
    this.assertAdmin(user);
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    });
    if (!member) throw new NotFoundException("Member not found.");
    if (member.userId === user.sub) {
      throw new BadRequestException("You cannot remove yourself. Ask another admin.");
    }
    if (member.role === "OWNER") {
      throw new ForbiddenException("Cannot remove the workspace owner.");
    }

    const removedUserId = member.userId;
    await this.serverCache.invalidateMembership(removedUserId, user.organizationId);
    void this.serverCache.invalidateShellBootstrap(user.organizationId);

    await this.prisma.$transaction([
      this.prisma.conversation.updateMany({
        where: { organizationId: user.organizationId, assignedToId: removedUserId },
        data: { assignedToId: null },
      }),
      this.prisma.lead.updateMany({
        where: { organizationId: user.organizationId, ownerId: removedUserId },
        data: { ownerId: null },
      }),
      this.prisma.task.updateMany({
        where: { organizationId: user.organizationId, assignedToId: removedUserId },
        data: { assignedToId: null },
      }),
      this.prisma.organizationMember.delete({ where: { id: memberId } }),
    ]);
    await this.serverCache.invalidateMembership(removedUserId, user.organizationId);
    void this.serverCache.invalidateShellBootstrap(user.organizationId);
    return { ok: true };
  }

  async getTeamLimits(user: JwtPayload) {
    const access = await this.entitlements.getAccess(user.organizationId);
    const memberCount = await this.prisma.organizationMember.count({
      where: { organizationId: user.organizationId },
    });
    const pendingInvites = await this.prisma.organizationInvite.count({
      where: { organizationId: user.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    return {
      memberCount,
      pendingInvites,
      limit: access.limits.teamMembers,
      canInvite: memberCount + pendingInvites < access.limits.teamMembers,
    };
  }

  private assertAdmin(user: JwtPayload) {
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can manage the team.");
    }
  }

  private assertCanManageInvites(user: JwtPayload) {
    if (
      user.role !== "OWNER" &&
      user.role !== "ADMIN" &&
      user.role !== "MANAGER"
    ) {
      throw new ForbiddenException("You do not have permission to manage invites.");
    }
  }

  async previewInvite(token: string) {
    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { tokenHash, acceptedAt: null },
      include: { organization: { select: { name: true, slug: true } } },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException("Invite not found or expired.");
    }
    return {
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name,
      expiresAt: invite.expiresAt,
    };
  }

  async createInvite(user: JwtPayload, email: string, role: MembershipRole = "AGENT") {
    if (!canInviteRole(user.role, role)) {
      throw new ForbiddenException("You cannot invite someone with this role.");
    }
    await this.entitlements.assertCanInviteMember(user.organizationId);

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      throw new BadRequestException("Enter a valid email address.");
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: user.organizationId,
        user: { email: normalized },
      },
    });
    if (existingMember) {
      throw new BadRequestException("This person is already on your team.");
    }

    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, settings: true },
    });
    if (!org) throw new NotFoundException();

    await this.prisma.organizationInvite.upsert({
      where: {
        organizationId_email: {
          organizationId: user.organizationId,
          email: normalized,
        },
      },
      create: {
        organizationId: user.organizationId,
        email: normalized,
        role,
        tokenHash,
        invitedById: user.sub,
        expiresAt,
      },
      update: {
        role,
        tokenHash,
        invitedById: user.sub,
        expiresAt,
        acceptedAt: null,
      },
    });

    const inviteSettings =
      org.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {};
    if (!(inviteSettings.coaching as { firstInviteAt?: string } | undefined)?.firstInviteAt) {
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          settings: mergeCoachingSettings(inviteSettings, {
            firstInviteAt: new Date().toISOString(),
          }) as object,
        },
      });
    }

    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");
    const inviteUrl = `${appUrl}/invite?token=${token}`;

    const emailSent = await this.email.sendTeamInvite({
      to: normalized,
      organizationName: org.name,
      inviteUrl,
      role,
    });

    return { sent: true, email: normalized, expiresAt, emailSent };
  }

  async acceptInvite(user: JwtPayload, token: string) {
    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { tokenHash, acceptedAt: null },
      include: { organization: true },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException("This invite link is invalid or expired.");
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser || dbUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException("Sign in with the email that received the invite.");
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: user.sub,
        },
      },
    });
    if (existing) {
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      await this.serverCache.invalidateMembership(user.sub, invite.organizationId);
      void this.serverCache.invalidateShellBootstrap(invite.organizationId);
      const session = await this.auth.switchOrganization(user.sub, invite.organizationId);
      return { ...session, alreadyMember: true };
    }

    const access = await this.entitlements.getAccess(invite.organizationId);

    await this.prisma.$transaction(
      async (tx) => {
        const memberCount = await tx.organizationMember.count({
          where: { organizationId: invite.organizationId },
        });
        if (memberCount >= access.limits.teamMembers) {
          throw new BadRequestException(
            "This workspace has reached its team member limit. Ask the owner to upgrade the plan.",
          );
        }

        await tx.organizationMember.create({
          data: {
            organizationId: invite.organizationId,
            userId: user.sub,
            role: invite.role,
          },
        });
        await tx.organizationInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.serverCache.invalidateMembership(user.sub, invite.organizationId);
    void this.serverCache.invalidateShellBootstrap(invite.organizationId);
    const session = await this.auth.switchOrganization(user.sub, invite.organizationId);
    return { ...session, alreadyMember: false };
  }

  async getPaymentIntegration(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const integration = normalizePaymentIntegration(settings.paymentIntegration);
    const apiBase = (
      this.config.get<string>("WEBHOOK_PUBLIC_URL") ??
      this.config.get<string>("API_URL") ??
      "http://localhost:4000"
    ).replace(/\/$/, "");
    return {
      autoWinOnPayment: integration.autoWinOnPayment,
      webhookUrl: `${apiBase}/api/v1/webhooks/payments/${user.organizationId}`,
      hasWebhookSecret: !!integration.razorpayWebhookSecret,
    };
  }

  async updatePaymentIntegration(
    user: JwtPayload,
    input: { razorpayWebhookSecret?: string | null; autoWinOnPayment?: boolean },
  ) {
    this.assertAdmin(user);
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const current = normalizePaymentIntegration(settings.paymentIntegration);
    const next = {
      razorpayWebhookSecret:
        input.razorpayWebhookSecret !== undefined
          ? input.razorpayWebhookSecret?.trim() || null
          : current.razorpayWebhookSecret,
      autoWinOnPayment:
        input.autoWinOnPayment !== undefined ? input.autoWinOnPayment : current.autoWinOnPayment,
    };
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          paymentIntegration: next,
        },
      },
    });
    void this.serverCache.invalidateShellBootstrap(user.organizationId);
    return this.getPaymentIntegration(user);
  }

  /** Single round-trip for dashboard shell: identity, billing, WhatsApp, setup FAB inputs. */
  async getShellBootstrap(user: JwtPayload) {
    return (await this.getShellBootstrapCached(user)).value;
  }

  async getShellBootstrapCached(user: JwtPayload) {
    const orgId = user.organizationId;
    const cacheKey = shellBootstrapCacheKey(orgId, user.sub);
    const version = await this.serverCache.getShellBootstrapVersion(orgId);
    const { value: cached } = await this.serverCache.getWithMeta<{
      version: number;
      payload: Awaited<ReturnType<OrganizationsService["buildShellBootstrapUncached"]>>;
    }>(cacheKey);
    if (cached && cached.version === version) {
      return { value: cached.payload, redisHit: true };
    }

    const payload = await this.buildShellBootstrapUncached(user);
    await this.serverCache.set(
      cacheKey,
      { version, payload },
      SERVER_CACHE_TTL.shellBootstrapSec,
    );
    return { value: payload, redisHit: false };
  }

  private async buildShellBootstrapUncached(user: JwtPayload) {
    const [me, billing, agency, accounts, onboardingProgress, onboardingCoaching] = await Promise.all([
      this.auth.getMe(user),
      this.billing.getStatus(user),
      this.agency.getStatus(user),
      this.whatsappAccounts.list(user),
      this.getOnboardingProgress(user.organizationId),
      this.getOnboardingCoaching(user.organizationId),
    ]);

    const connected = accounts.some((a) => a.isActive);
    const connectionHealth = connected
      ? await this.whatsappAccounts.getConnectionHealthForOrganization(user.organizationId)
      : undefined;

    const capabilities = await this.getConversationCapabilities(user.organizationId);

    let paymentIntegration: Awaited<ReturnType<OrganizationsService["getPaymentIntegration"]>> | undefined;
    if (user.role === "OWNER" || user.role === "ADMIN") {
      paymentIntegration = await this.getPaymentIntegration(user);
    }

    return {
      me,
      billing,
      agency,
      whatsapp: {
        accounts,
        connectionHealth,
      },
      onboardingProgress,
      onboardingCoaching,
      capabilities,
      paymentIntegration,
    };
  }

  private async getConversationCapabilities(organizationId: string) {
    const aiOn = !!this.config.get<string>("OPENAI_API_KEY");
    const access = await this.entitlements.getAccess(organizationId);
    const aiEntitled = aiOn && access.hasAccess;
    return {
      aiClassification: aiEntitled,
      aiSuggestReply: aiEntitled,
      primaryUseCase: "conversation_intelligence" as const,
    };
  }

  /** Coaching slice only — for inbox takeover nudge without full activation scan. */
  async getOnboardingCoaching(organizationId: string) {
    const [org, classifiedLead, handoffsWaiting, inviteCount, teamMembers] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      }),
      this.prisma.lead.findFirst({
        where: { organizationId, lastClassifiedAt: { not: null } },
        select: { id: true },
      }),
      this.prisma.conversation.count({
        where: {
          organizationId,
          metadata: { path: ["requiresHuman"], equals: true },
        },
      }),
      this.prisma.organizationInvite.count({ where: { organizationId } }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
    ]);

    const prevSettings =
      org?.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {};
    const opsSettings = normalizeWorkspaceOpsSettings(prevSettings.ops);
    const coachingPersist =
      prevSettings.coaching && typeof prevSettings.coaching === "object"
        ? (prevSettings.coaching as Record<string, unknown>)
        : {};
    const hasTeam =
      teamMembers > 1 || !!coachingPersist.firstInviteAt || inviteCount > 0;
    const hasTakeover = !!coachingPersist.firstTakeoverAt;

    const coaching = buildPostActivationCoaching({
      firstValue: !!classifiedLead,
      digestEnabled: opsSettings.digest.enabled,
      hasTeam,
      hasTakeover,
      handoffsWaiting,
    });

    return { coaching };
  }

  async getOnboardingProgress(organizationId: string) {
    const cacheKey = onboardingCacheKey(organizationId);
    const cached =
      await this.serverCache.get<
        Awaited<ReturnType<OrganizationsService["computeOnboardingProgress"]>>
      >(cacheKey);
    if (cached) return cached;

    const result = await this.computeOnboardingProgress(organizationId);
    await this.serverCache.set(cacheKey, result, SERVER_CACHE_TTL.onboardingSec);
    return result;
  }

  private async computeOnboardingProgress(organizationId: string) {
    const [
      whatsappAccount,
      firstInbound,
      firstClassified,
      pipelineMovedLead,
      goLive,
      org,
      inboundCount,
      classifiedCount,
      outboundCount,
      teamMembers,
      access,
    ] = await Promise.all([
      this.prisma.whatsappAccount.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      this.prisma.message.findFirst({
        where: { organizationId, direction: "INBOUND" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      this.prisma.lead.findFirst({
        where: { organizationId, lastClassifiedAt: { not: null } },
        orderBy: { lastClassifiedAt: "asc" },
        select: { lastClassifiedAt: true },
      }),
      this.prisma.lead.findFirst({
        where: {
          organizationId,
          OR: [
            { stage: { not: "NEW" } },
            { stageHistory: { some: { changedBy: { not: null } } } },
          ],
        },
        orderBy: { updatedAt: "asc" },
        select: { updatedAt: true },
      }),
      this.whatsappAccounts.getGoLiveProgress(organizationId),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      }),
      this.prisma.message.count({
        where: { organizationId, direction: "INBOUND" },
      }),
      this.prisma.lead.count({
        where: { organizationId, lastClassifiedAt: { not: null } },
      }),
      this.prisma.message.count({
        where: { organizationId, direction: "OUTBOUND" },
      }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.entitlements.getAccess(organizationId),
    ]);

    const steps = {
      whatsappConnected: !!whatsappAccount,
      firstInbound: !!firstInbound,
      aiClassified: !!firstClassified,
      pipelineMoved: !!pipelineMovedLead,
    };

    const values = Object.values(steps);
    const completedCount = values.filter(Boolean).length;
    const allComplete = activationAllComplete(steps);
    const next = activationNextMilestone(steps);

    const milestones = {
      whatsappConnectedAt: whatsappAccount?.createdAt?.toISOString() ?? null,
      firstInboundAt: firstInbound?.createdAt?.toISOString() ?? null,
      aiClassifiedAt: firstClassified?.lastClassifiedAt?.toISOString() ?? null,
      pipelineMovedAt: pipelineMovedLead?.updatedAt?.toISOString() ?? null,
      completedAt: allComplete
        ? ([
            whatsappAccount?.createdAt,
            firstInbound?.createdAt,
            firstClassified?.lastClassifiedAt,
            pipelineMovedLead?.updatedAt,
          ]
            .filter((d): d is Date => !!d)
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString() ?? null)
        : null,
    };

    const isPaid =
      access.planId !== "trial" &&
      (access.status === "ACTIVE" || access.status === "PAST_DUE");
    const firstActionDone = steps.pipelineMoved || outboundCount > 0;
    const firstValueDone = steps.aiClassified;

    let opsStage: "setup" | "activating" | "activated" | "acting" | "paying" | "at_risk" =
      "setup";
    if (!steps.whatsappConnected) {
      opsStage = "setup";
    } else if (!firstValueDone) {
      opsStage = "activating";
    } else if (isPaid) {
      opsStage = "paying";
    } else if (
      access.trialEndsAt &&
      new Date(access.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
    ) {
      opsStage = "at_risk";
    } else if (firstActionDone) {
      opsStage = "acting";
    } else {
      opsStage = "activated";
    }

    const daysSinceConnect =
      whatsappAccount?.createdAt != null
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - whatsappAccount.createdAt.getTime()) / (24 * 60 * 60 * 1000),
            ),
          )
        : null;

    const ops = {
      stage: opsStage,
      activated: allComplete,
      firstValue: firstValueDone,
      firstAction: firstActionDone,
      paid: isPaid,
      planId: access.planId,
      subscriptionStatus: access.status,
      hasAccess: access.hasAccess,
      trialEndsAt: access.trialEndsAt,
      requiresUpgrade: access.requiresUpgrade,
      daysSinceConnect,
      proof: {
        inboundMessages: inboundCount,
        classifiedLeads: classifiedCount,
        outboundMessages: outboundCount,
        teamMembers,
      },
    };

    const prevSettings =
      org?.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {};
    const opsSettings = normalizeWorkspaceOpsSettings(prevSettings.ops);
    const coachingPersist =
      prevSettings.coaching && typeof prevSettings.coaching === "object"
        ? (prevSettings.coaching as Record<string, unknown>)
        : {};
    const hasTeam =
      teamMembers > 1 ||
      !!coachingPersist.firstInviteAt ||
      (await this.prisma.organizationInvite.count({
        where: { organizationId },
      })) > 0;
    const handoffsWaiting = await this.prisma.conversation.count({
      where: {
        organizationId,
        metadata: { path: ["requiresHuman"], equals: true },
      },
    });
    const hasTakeover = !!coachingPersist.firstTakeoverAt;

    const coaching = buildPostActivationCoaching({
      firstValue: firstValueDone,
      digestEnabled: opsSettings.digest.enabled,
      hasTeam,
      hasTakeover,
      handoffsWaiting,
    });

    // Persist activation snapshot for CS / funnel analytics (never wipe prior keys).
    const prevActivation =
      prevSettings.activation && typeof prevSettings.activation === "object"
        ? (prevSettings.activation as Record<string, unknown>)
        : {};
    const nextActivation = {
      ...prevActivation,
      ...Object.fromEntries(
        Object.entries(milestones).filter(([, v]) => v != null),
      ),
      completedCount,
      allComplete,
      opsStage,
      paid: isPaid,
      firstValue: firstValueDone,
      firstAction: firstActionDone,
      coachingCompleted: coaching.completedCount,
      coachingAllComplete: coaching.allComplete,
      updatedAt: new Date().toISOString(),
    };
    const activationChanged =
      JSON.stringify(prevActivation) !==
      JSON.stringify({
        ...prevActivation,
        ...Object.fromEntries(
          Object.entries(milestones).filter(([, v]) => v != null),
        ),
        completedCount,
        allComplete,
        opsStage,
        paid: isPaid,
        firstValue: firstValueDone,
        firstAction: firstActionDone,
        coachingCompleted: coaching.completedCount,
        coachingAllComplete: coaching.allComplete,
      });

    if (activationChanged) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...prevSettings,
            activation: nextActivation,
          },
        },
      });
    }

    return {
      ...steps,
      completedCount,
      totalSteps: values.length,
      allComplete,
      milestones,
      funnel: buildActivationFunnelMetrics(milestones),
      nextAction: next,
      goLive,
      ops,
      coaching,
      platformHealth: {
        openAiConfigured: Boolean(this.config.get<string>("OPENAI_API_KEY")?.trim()),
      },
    };
  }
}
