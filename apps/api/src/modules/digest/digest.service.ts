import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import { EntitlementsService } from "../billing/entitlements.service";
import {
  getIstNow,
  normalizeWorkspaceOpsSettings,
  type WorkspaceOpsSettings,
} from "../organizations/workspace-settings";

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getOpsSettings(organizationId: string): Promise<WorkspaceOpsSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    return normalizeWorkspaceOpsSettings(settings.ops);
  }

  async updateOpsSettings(
    organizationId: string,
    patch: Partial<WorkspaceOpsSettings>,
  ): Promise<WorkspaceOpsSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    const current = normalizeWorkspaceOpsSettings(settings.ops);
    const next: WorkspaceOpsSettings = {
      digest: { ...current.digest, ...patch.digest },
      sla: { ...current.sla, ...patch.sla },
    };
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          ops: next as object,
        },
      },
    });
    return next;
  }

  async runDailyDigestJob() {
    const { hour, dateKey } = getIstNow();
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, name: true, settings: true },
    });

    let sent = 0;
    let skipped = 0;

    for (const org of orgs) {
      try {
        const access = await this.entitlements.getAccess(org.id);
        if (!access.hasAccess) {
          skipped++;
          continue;
        }

        const settings = (org.settings ?? {}) as Record<string, unknown>;
        const ops = normalizeWorkspaceOpsSettings(settings.ops);

        if (!ops.digest.enabled) {
          skipped++;
          continue;
        }
        if (ops.digest.hourIst !== hour) {
          skipped++;
          continue;
        }
        if (ops.digest.lastSentDate === dateKey) {
          skipped++;
          continue;
        }

        const recipients = await this.ownerEmails(org.id);
        if (recipients.length === 0) {
          skipped++;
          continue;
        }

        const snapshot = await this.buildSnapshot(org.id);
        if (!snapshot.hasActivity) {
          skipped++;
          continue;
        }

        const appUrl = (
          this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
        ).replace(/\/$/, "");

        await this.email.sendDailyDigest({
          to: recipients,
          organizationName: org.name,
          dashboardUrl: `${appUrl}/dashboard`,
          inboxUrl: `${appUrl}/dashboard/inbox`,
          insightsUrl: `${appUrl}/dashboard/insights`,
          ...snapshot,
        });

        await this.updateOpsSettings(org.id, {
          digest: { ...ops.digest, lastSentDate: dateKey },
        });

        sent++;
      } catch (err) {
        this.logger.warn(`Digest failed for org ${org.id}: ${err}`);
        skipped++;
      }
    }

    return { sent, skipped, organizations: orgs.length, istHour: hour, dateKey };
  }

  private async buildSnapshot(organizationId: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      pipelineAgg,
      wonYesterday,
      handoffs,
      unreadAgg,
      hotLeads,
      overdueTasks,
      openTasksByMember,
    ] = await Promise.all([
      this.prisma.lead.aggregate({
        where: {
          organizationId,
          stage: { notIn: ["WON", "LOST"] },
          valueCents: { not: null },
        },
        _sum: { valueCents: true },
      }),
      this.prisma.lead.count({
        where: {
          organizationId,
          stage: "WON",
          wonAt: { gte: dayAgo },
        },
      }),
      this.prisma.conversation.count({
        where: {
          organizationId,
          metadata: { path: ["requiresHuman"], equals: true },
        },
      }),
      this.prisma.conversation.aggregate({
        where: { organizationId },
        _sum: { unreadCount: true },
      }),
      this.prisma.lead.findMany({
        where: {
          organizationId,
          score: { gte: 70 },
          stage: { notIn: ["WON", "LOST"] },
        },
        orderBy: { score: "desc" },
        take: 5,
        select: {
          displayName: true,
          phone: true,
          score: true,
          stage: true,
          profile: true,
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueAt: { lt: now },
        },
      }),
      this.prisma.task.groupBy({
        by: ["assignedToId"],
        where: {
          organizationId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
        _count: { id: true },
      }),
    ]);

    const memberIds = openTasksByMember
      .map((g) => g.assignedToId)
      .filter((id): id is string => !!id);
    const members =
      memberIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const pipelineInr = (pipelineAgg._sum.valueCents ?? 0) / 100;
    const unread = unreadAgg._sum.unreadCount ?? 0;

    const hotLeadRows = hotLeads.map((l) => {
      const profile = (l.profile ?? {}) as Record<string, unknown>;
      return {
        label: l.displayName ?? l.phone,
        score: l.score,
        stage: l.stage.replace("_", " "),
        nextAction:
          typeof profile.nextAction === "string" ? profile.nextAction : null,
      };
    });

    const teamWorkload = openTasksByMember
      .map((g) => {
        const user = members.find((m) => m.id === g.assignedToId);
        return {
          name: user?.name ?? user?.email ?? "Unassigned",
          openTasks: g._count.id,
        };
      })
      .sort((a, b) => b.openTasks - a.openTasks)
      .slice(0, 5);

    const hasActivity =
      pipelineInr > 0 ||
      wonYesterday > 0 ||
      handoffs > 0 ||
      unread > 0 ||
      hotLeadRows.length > 0 ||
      overdueTasks > 0;

    return {
      hasActivity,
      pipelineInr,
      wonYesterday,
      handoffs,
      unread,
      overdueTasks,
      hotLeads: hotLeadRows,
      teamWorkload,
    };
  }

  private async ownerEmails(organizationId: string): Promise<string[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
      include: { user: { select: { email: true } } },
    });
    return [...new Set(members.map((m) => m.user.email).filter(Boolean))];
  }
}
