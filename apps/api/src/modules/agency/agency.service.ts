import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "@growvisi/shared";
import { DEFAULT_PIPELINE_STAGES, GROWVISI_WEB_URL, PLAN_LIMITS, TRIAL_DAYS } from "@growvisi/shared";
import { EmailService } from "../auth/email.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddedSignupService } from "../whatsapp-accounts/embedded-signup.service";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";
import { ServerCacheService } from "../server-cache/server-cache.service";

export interface AgencyClientRow {
  id: string;
  displayName: string;
  organizationId: string;
  slug: string;
  createdAt: string;
  whatsappConnected: boolean;
  unreadMessages: number;
  handoffs: number;
  openPipelineInr: number;
  openLeads: number;
  connectionStatus: "live" | "setup" | "token" | "disconnected";
  goLiveProgressPct: number;
  displayPhoneNumber: string | null;
  /** Meta session needs reconnect via Embedded Signup (not paste-token). */
  needsReconnect: boolean;
  planId: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly whatsappAccounts: WhatsappAccountsService,
    private readonly embeddedSignup: EmbeddedSignupService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly serverCache: ServerCacheService,
  ) {}

  async getStatus(user: JwtPayload) {
    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { id: true, name: true, kind: true },
    });
    if (!org) throw new NotFoundException();

    const access = await this.entitlements.getAccess(org.id);
    const clientCount = await this.prisma.agencyClient.count({
      where: { agencyOrganizationId: org.id },
    });

    return {
      kind: org.kind,
      isAgency: org.kind === "AGENCY",
      canEnableAgency: access.planId === "pro" && org.kind === "STANDARD",
      clientCount,
      clientLimit: access.limits.agencyClients,
    };
  }

  async enableAgencyMode(user: JwtPayload) {
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("Only workspace admins can enable Agency hub.");
    }
    await this.entitlements.assertPlanAtLeast(user.organizationId, "pro");

    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { id: true, kind: true, clientOfAgency: { select: { id: true } } },
    });
    if (!org) throw new NotFoundException();
    if (org.clientOfAgency) {
      throw new BadRequestException("Client workspaces cannot become agency hubs.");
    }
    if (org.kind === "AGENCY") {
      return { ok: true, kind: "AGENCY" as const };
    }

    await this.prisma.organization.update({
      where: { id: org.id },
      data: { kind: "AGENCY" },
    });

    return { ok: true, kind: "AGENCY" as const };
  }

  async listClients(user: JwtPayload): Promise<AgencyClientRow[]> {
    await this.assertAgencyHub(user);

    const links = await this.prisma.agencyClient.findMany({
      where: { agencyOrganizationId: user.organizationId },
      orderBy: { displayName: "asc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            subscription: {
              select: { planId: true, status: true, createdAt: true },
            },
          },
        },
      },
    });

    const orgIds = links.map((l) => l.clientOrganizationId);

    // Batched cross-client aggregates — replaces the previous 5×N per-client
    // queries with 5 grouped queries. WhatsApp summaries stay per-org (their
    // logic lives in the accounts service) but run in parallel.
    const [
      waActiveGroups,
      unreadGroups,
      handoffGroups,
      pipelineGroups,
      openLeadGroups,
      waSummaries,
    ] = await Promise.all([
      this.prisma.whatsappAccount.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds }, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.conversation.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds } },
        _sum: { unreadCount: true },
      }),
      this.prisma.conversation.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: orgIds },
          metadata: { path: ["requiresHuman"], equals: true },
        },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: orgIds },
          stage: { notIn: ["WON", "LOST"] },
          valueCents: { not: null },
        },
        _sum: { valueCents: true },
      }),
      this.prisma.lead.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: orgIds }, stage: { notIn: ["WON", "LOST"] } },
        _count: { _all: true },
      }),
      Promise.all(
        orgIds.map(async (orgId) => ({
          orgId,
          summary: await this.whatsappAccounts.getOrganizationWhatsAppSummary(orgId),
        })),
      ),
    ]);

    const waActiveByOrg = new Map(waActiveGroups.map((g) => [g.organizationId, g._count._all]));
    const unreadByOrg = new Map(
      unreadGroups.map((g) => [g.organizationId, g._sum.unreadCount ?? 0]),
    );
    const handoffByOrg = new Map(handoffGroups.map((g) => [g.organizationId, g._count._all]));
    const pipelineByOrg = new Map(
      pipelineGroups.map((g) => [g.organizationId, g._sum.valueCents ?? 0]),
    );
    const openLeadByOrg = new Map(openLeadGroups.map((g) => [g.organizationId, g._count._all]));
    const waSummaryByOrg = new Map(waSummaries.map((s) => [s.orgId, s.summary]));

    return links.map((link) => {
      const orgId = link.clientOrganizationId;
      const waSummary = waSummaryByOrg.get(orgId)!;
      const sub = link.client.subscription;
      const trialEndsAt =
        sub?.planId === "trial" && sub.createdAt
          ? new Date(sub.createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
          : null;

      return {
        id: link.id,
        displayName: link.displayName,
        organizationId: link.client.id,
        slug: link.client.slug,
        createdAt: link.createdAt.toISOString(),
        whatsappConnected: (waActiveByOrg.get(orgId) ?? 0) > 0,
        unreadMessages: unreadByOrg.get(orgId) ?? 0,
        handoffs: handoffByOrg.get(orgId) ?? 0,
        openPipelineInr: (pipelineByOrg.get(orgId) ?? 0) / 100,
        openLeads: openLeadByOrg.get(orgId) ?? 0,
        connectionStatus: waSummary.connectionStatus,
        goLiveProgressPct: waSummary.goLiveProgressPct,
        displayPhoneNumber: waSummary.displayPhoneNumber,
        needsReconnect: waSummary.tokenNeedsRefresh || waSummary.connectionStatus === "token",
        planId: sub?.planId ?? "trial",
        subscriptionStatus: sub?.status ?? "TRIALING",
        trialEndsAt,
      };
    });
  }

  async getClientsHealthSummary(user: JwtPayload) {
    const clients = await this.listClients(user);
    const live = clients.filter((c) => c.connectionStatus === "live").length;
    const setup = clients.filter((c) => c.connectionStatus === "setup").length;
    const token = clients.filter((c) => c.connectionStatus === "token").length;
    const disconnected = clients.filter((c) => c.connectionStatus === "disconnected").length;

    return {
      total: clients.length,
      live,
      setup,
      token,
      reconnect: token,
      disconnected,
      openPipelineInr: clients.reduce((s, c) => s + c.openPipelineInr, 0),
      handoffs: clients.reduce((s, c) => s + c.handoffs, 0),
      unreadMessages: clients.reduce((s, c) => s + c.unreadMessages, 0),
      clients,
    };
  }

  async completeClientEmbeddedSignup(
    user: JwtPayload,
    clientOrganizationId: string,
    input: {
      code: string;
      phoneNumberId: string;
      wabaId: string;
      finishEvent?: string;
      connectMethod?: "embedded" | "embedded_coex";
    },
  ) {
    await this.assertAgencyAccessToClient(user, clientOrganizationId);
    return this.embeddedSignup.completeSignup(user, input, {
      targetOrganizationId: clientOrganizationId,
    });
  }

  async getClientWhatsAppSummary(user: JwtPayload, clientOrganizationId: string) {
    await this.assertAgencyAccessToClient(user, clientOrganizationId);
    return this.whatsappAccounts.getOrganizationWhatsAppSummary(clientOrganizationId);
  }

  async renameClient(user: JwtPayload, clientOrganizationId: string, displayName: string) {
    await this.assertAgencyAccessToClient(user, clientOrganizationId);
    const cleanName = displayName.trim();
    if (!cleanName) throw new BadRequestException("Client name is required.");

    const link = await this.prisma.agencyClient.findFirst({
      where: {
        agencyOrganizationId: user.organizationId,
        clientOrganizationId,
      },
    });
    if (!link) throw new NotFoundException("Client not in your portfolio.");

    await this.prisma.$transaction([
      this.prisma.agencyClient.update({
        where: { id: link.id },
        data: { displayName: cleanName },
      }),
      this.prisma.organization.update({
        where: { id: clientOrganizationId },
        data: { name: cleanName },
      }),
    ]);

    return { ok: true, displayName: cleanName, organizationId: clientOrganizationId };
  }

  /**
   * Remove client from agency portfolio (frees a slot). Client org remains;
   * agency staff memberships on the client are left intact for access if needed.
   */
  async removeClientFromPortfolio(user: JwtPayload, clientOrganizationId: string) {
    await this.assertAgencyAccessToClient(user, clientOrganizationId);

    const link = await this.prisma.agencyClient.findFirst({
      where: {
        agencyOrganizationId: user.organizationId,
        clientOrganizationId,
      },
    });
    if (!link) throw new NotFoundException("Client not in your portfolio.");

    await this.prisma.agencyClient.delete({ where: { id: link.id } });

    return { ok: true, removedOrganizationId: clientOrganizationId };
  }

  async inviteClientOwner(user: JwtPayload, clientOrganizationId: string, email: string) {
    await this.assertAgencyAccessToClient(user, clientOrganizationId);
    await this.entitlements.assertCanInviteMember(clientOrganizationId);

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      throw new BadRequestException("Enter a valid email address.");
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: clientOrganizationId,
        user: { email: normalized },
      },
    });
    if (existingMember) {
      throw new BadRequestException("This person is already on the client workspace.");
    }

    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const org = await this.prisma.organization.findUnique({
      where: { id: clientOrganizationId },
      select: { name: true },
    });
    if (!org) throw new NotFoundException();

    await this.prisma.organizationInvite.upsert({
      where: {
        organizationId_email: {
          organizationId: clientOrganizationId,
          email: normalized,
        },
      },
      create: {
        organizationId: clientOrganizationId,
        email: normalized,
        role: "OWNER",
        tokenHash,
        invitedById: user.sub,
        expiresAt,
      },
      update: {
        role: "OWNER",
        tokenHash,
        invitedById: user.sub,
        expiresAt,
        acceptedAt: null,
      },
    });

    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");
    const inviteUrl = `${appUrl}/invite?token=${token}`;

    await this.email.sendTeamInvite({
      to: normalized,
      organizationName: org.name,
      inviteUrl,
      role: "OWNER",
    });

    return { sent: true, email: normalized, expiresAt, organizationId: clientOrganizationId };
  }

  async createClient(user: JwtPayload, displayName: string) {
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("Only workspace admins can add client workspaces.");
    }
    await this.assertAgencyHub(user);
    const access = await this.entitlements.assertPlanAtLeast(user.organizationId, "pro");

    const count = await this.prisma.agencyClient.count({
      where: { agencyOrganizationId: user.organizationId },
    });
    if (count >= access.limits.agencyClients) {
      throw new HttpException(
        {
          message: `Your Operator plan allows ${access.limits.agencyClients} client workspaces. Remove a client from the portfolio to free a slot, or contact sales for more.`,
          code: "AGENCY_CLIENT_LIMIT",
          reason: "agency_clients",
          limit: access.limits.agencyClients,
          used: count,
          planId: access.planId,
          suggestedPlan: "pro",
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const cleanName = displayName.trim();
    if (!cleanName) throw new BadRequestException("Client name is required.");

    const agency = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slug: true },
    });
    const slug = await this.uniqueClientSlug(agency!.slug, cleanName);

    const agencyStaff = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { userId: true, role: true },
    });

    const trialSeatLimit = PLAN_LIMITS.trial.teamMembers;
    if (agencyStaff.length > trialSeatLimit) {
      throw new HttpException(
        {
          message: `New client workspaces start on trial with ${trialSeatLimit} team seats. Your agency has ${agencyStaff.length} admins — reduce agency admins or contact sales.`,
          code: "TEAM_SEAT_LIMIT",
          reason: "seats",
          limit: trialSeatLimit,
          used: agencyStaff.length,
          planId: "trial",
          suggestedPlan: "growth",
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const link = await this.prisma.$transaction(async (tx) => {
      const clientOrg = await tx.organization.create({
        data: {
          name: cleanName,
          slug,
          kind: "STANDARD",
        },
      });

      await tx.workspace.create({
        data: {
          organizationId: clientOrg.id,
          name: "Default",
          slug: "default",
          isDefault: true,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((s) => ({
          organizationId: clientOrg.id,
          leadStage: s.stage as never,
          name: s.name,
          order: s.order,
          color: s.color,
          isWon: "isWon" in s ? s.isWon : false,
          isLost: "isLost" in s ? s.isLost : false,
        })),
      });

      await tx.subscription.create({
        data: {
          organizationId: clientOrg.id,
          planId: "trial",
          status: "TRIALING",
        },
      });

      for (const member of agencyStaff) {
        await tx.organizationMember.create({
          data: {
            organizationId: clientOrg.id,
            userId: member.userId,
            role: "ADMIN",
          },
        });
      }

      return tx.agencyClient.create({
        data: {
          agencyOrganizationId: user.organizationId,
          clientOrganizationId: clientOrg.id,
          displayName: cleanName,
        },
        include: {
          client: { select: { id: true, name: true, slug: true } },
        },
      });
    });

    await Promise.all(
      agencyStaff.map((member) =>
        this.serverCache.invalidateMembership(member.userId, link.client.id),
      ),
    );

    return {
      id: link.id,
      displayName: link.displayName,
      organizationId: link.client.id,
      slug: link.client.slug,
    };
  }

  private async assertAgencyHub(user: JwtPayload) {
    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { kind: true },
    });
    if (!org || org.kind !== "AGENCY") {
      throw new ForbiddenException("Enable Agency hub on an Operator workspace to manage clients.");
    }
  }

  private async assertAgencyAccessToClient(user: JwtPayload, clientOrganizationId: string) {
    await this.assertAgencyHub(user);
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("Only workspace admins can manage client WhatsApp.");
    }
    const link = await this.prisma.agencyClient.findFirst({
      where: {
        agencyOrganizationId: user.organizationId,
        clientOrganizationId,
      },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException("This client is not in your agency portfolio.");
    }
  }

  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
  }

  private async uniqueClientSlug(agencySlug: string, clientName: string) {
    const base = `${agencySlug}-${this.slugify(clientName)}`.slice(0, 48);
    let slug = base;
    let n = 0;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`.slice(0, 48);
    }
    return slug;
  }
}
