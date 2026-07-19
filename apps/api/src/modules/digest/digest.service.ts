import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_WEB_URL, HOT_LEAD_SCORE_THRESHOLD } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import {
  getIstNow,
  mergeCoachingSettings,
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
    private readonly knowledge: KnowledgeRetrievalService,
    private readonly whatsapp: WhatsappMessagingService,
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
    let nextSettings: Record<string, unknown> = {
      ...settings,
      ops: next as object,
    };
    if (next.digest.enabled && !current.digest.enabled) {
      nextSettings = mergeCoachingSettings(nextSettings, {
        digestEnabledAt: new Date().toISOString(),
      });
    } else if (next.digest.enabled && !(settings.coaching as { digestEnabledAt?: string } | undefined)?.digestEnabledAt) {
      nextSettings = mergeCoachingSettings(nextSettings, {
        digestEnabledAt: new Date().toISOString(),
      });
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: nextSettings as object,
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
        const channel = ops.digest.channel;
        const wantsEmail = channel === "email" || channel === "both";
        const wantsWhatsapp =
          (channel === "whatsapp" || channel === "both") && !!ops.digest.whatsappPhone;

        if (!wantsEmail && !wantsWhatsapp) {
          skipped++;
          continue;
        }
        if (wantsEmail && recipients.length === 0 && !wantsWhatsapp) {
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

        const urls = {
          dashboardUrl: `${appUrl}/dashboard`,
          inboxUrl: `${appUrl}/dashboard/inbox`,
          insightsUrl: `${appUrl}/dashboard#recommendations`,
          knowledgeUrl: `${appUrl}/dashboard/automations`,
        };

        let delivered = false;

        if (wantsEmail && recipients.length > 0) {
          await this.email.sendDailyDigest({
            to: recipients,
            organizationName: org.name,
            ...urls,
            ...snapshot,
          });
          delivered = true;
        }

        if (wantsWhatsapp && ops.digest.whatsappPhone) {
          const ok = await this.sendWhatsappDigest(
            org.id,
            ops.digest.whatsappPhone,
            org.name,
            snapshot,
            urls.inboxUrl,
            ops.digest,
          );
          delivered = delivered || ok;
        }

        if (!delivered) {
          skipped++;
          continue;
        }

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
      kbHealth,
      recentKnowledgeGaps,
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
          score: { gte: HOT_LEAD_SCORE_THRESHOLD },
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
      this.knowledge.getHealth(organizationId),
      this.prisma.aiRun.count({
        where: {
          organizationId,
          type: "classify",
          createdAt: { gte: dayAgo },
          output: { path: ["metrics", "knowledgeGap"], equals: true },
        },
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
      overdueTasks > 0 ||
      kbHealth.gapRiskScore >= 50 ||
      recentKnowledgeGaps > 0;

    return {
      hasActivity,
      pipelineInr,
      wonYesterday,
      handoffs,
      unread,
      overdueTasks,
      hotLeads: hotLeadRows,
      teamWorkload,
      kbHealth: {
        gapRiskScore: kbHealth.gapRiskScore,
        chunkCount: kbHealth.chunkCount,
        readyForResponsivePreset: kbHealth.readyForResponsivePreset,
      },
      recentKnowledgeGaps,
    };
  }

  private async ownerEmails(organizationId: string): Promise<string[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
      include: { user: { select: { email: true } } },
    });
    return [...new Set(members.map((m) => m.user.email).filter(Boolean))];
  }

  private async sendWhatsappDigest(
    organizationId: string,
    toPhone: string,
    organizationName: string,
    snapshot: Awaited<ReturnType<DigestService["buildSnapshot"]>>,
    inboxUrl: string,
    digest: {
      whatsappTemplateName?: string | null;
      digestLocale: "en" | "hi";
    },
  ): Promise<boolean> {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId, isActive: true },
      select: { phoneNumberId: true, accessTokenEnc: true, isActive: true },
    });
    if (!account) {
      this.logger.warn(`WhatsApp digest skipped for ${organizationId}: no active number`);
      return false;
    }

    const formatInr = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);

    const hi = digest.digestLocale === "hi";
    const kbAlert =
      snapshot.kbHealth.gapRiskScore >= 50 || snapshot.recentKnowledgeGaps > 0;
    const kbLine = kbAlert
      ? hi
        ? snapshot.kbHealth.chunkCount === 0
          ? "⚠️ Business Knowledge खाली है — rate card अपलोड करें"
          : `⚠️ ${snapshot.recentKnowledgeGaps} बार जवाब docs में नहीं मिला (24h)`
        : snapshot.kbHealth.chunkCount === 0
          ? "⚠️ Business Knowledge empty — upload rate card & FAQs"
          : `⚠️ ${snapshot.recentKnowledgeGaps} reply(ies) lacked matching docs (24h)`
      : null;

    const pipelineStr = formatInr(snapshot.pipelineInr);
    const templateParams = [
      organizationName,
      pipelineStr,
      String(snapshot.wonYesterday),
      String(snapshot.handoffs),
      String(snapshot.unread),
      inboxUrl,
    ];

    if (digest.whatsappTemplateName?.trim()) {
      try {
        await this.whatsapp.sendTemplate(
          account,
          toPhone,
          digest.whatsappTemplateName.trim(),
          hi ? "hi" : "en",
          templateParams,
        );
        return true;
      } catch (err) {
        this.logger.warn(
          `WhatsApp template digest failed for ${organizationId}, falling back to text: ${err}`,
        );
      }
    }

    const lines = hi
      ? [
          `Growvisi — ${organizationName}`,
          kbLine,
          `पाइपलाइन: ${pipelineStr}`,
          `कल जीते: ${snapshot.wonYesterday}`,
          snapshot.handoffs > 0 ? `हैंडऑफ: ${snapshot.handoffs}` : null,
          snapshot.unread > 0 ? `अपठित: ${snapshot.unread}` : null,
          snapshot.overdueTasks > 0 ? `ओवरड्यू टास्क: ${snapshot.overdueTasks}` : null,
          `इनबॉक्स: ${inboxUrl}`,
        ]
      : [
          `Growvisi — ${organizationName}`,
          kbLine,
          `Pipeline: ${pipelineStr}`,
          `Won (24h): ${snapshot.wonYesterday}`,
          snapshot.handoffs > 0 ? `Handoffs: ${snapshot.handoffs}` : null,
          snapshot.unread > 0 ? `Unread: ${snapshot.unread}` : null,
          snapshot.overdueTasks > 0 ? `Overdue tasks: ${snapshot.overdueTasks}` : null,
          `Open inbox: ${inboxUrl}`,
        ];

    try {
      await this.whatsapp.sendText(account, toPhone, lines.filter(Boolean).join("\n").slice(0, 4096));
      return true;
    } catch (err) {
      this.logger.warn(`WhatsApp digest failed for ${organizationId}: ${err}`);
      return false;
    }
  }
}
