import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { EntitlementsService } from "../billing/entitlements.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import {
  normalizeAutomationPreferences,
  type AutomationPreferences,
} from "./automation-preferences";

@Injectable()
export class AutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
  ) {}

  async getPreferences(user: JwtPayload): Promise<AutomationPreferences> {
    return this.getPreferencesForOrg(user.organizationId);
  }

  async getPreferencesForOrg(organizationId: string): Promise<AutomationPreferences> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    return normalizeAutomationPreferences(
      (org?.settings as Record<string, unknown>)?.automations,
    );
  }

  async updatePreferences(
    user: JwtPayload,
    patch: Partial<AutomationPreferences>,
  ): Promise<AutomationPreferences> {
    await this.entitlements.assertHasAccess(user.organizationId);
    const { welcome: _ignored, ...serverPatch } = patch;
    if (serverPatch.staleDeal === true) {
      await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    }
    const current = await this.getPreferences(user);
    const next: AutomationPreferences = { ...current, ...serverPatch };
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          automations: next,
        },
      },
    });
    this.audit.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: "SETTINGS_CHANGE",
      resource: "automations",
      metadata: { patch: serverPatch },
    });
    return next;
  }

  async handlePostClassification(opts: {
    organizationId: string;
    conversationId: string;
    leadId: string;
    leadName: string | null;
    leadPhone: string;
    score: number;
    stageChanged: boolean;
    newStage: string;
  }) {
    const prefs = await this.getPreferencesForOrg(opts.organizationId);

    if (opts.stageChanged && prefs.stage) {
      await this.logExecution(opts.organizationId, "stage", "ai_classification",
        `AI moved lead to ${opts.newStage}`, opts.leadId);
    }

    if (prefs.notify && opts.score >= 80) {
      await this.maybeSendHotLeadAlert(opts.organizationId, opts);
      await this.logExecution(opts.organizationId, "notify", "score_threshold",
        `Hot lead alert sent (score: ${opts.score})`, opts.leadId);
    }
  }

  async handleHandoff(opts: {
    organizationId: string;
    conversationId: string;
    leadId: string;
    leadName: string | null;
    leadPhone: string;
    reason: string;
    assigneeUserId?: string | null;
  }) {
    const prefs = await this.getPreferencesForOrg(opts.organizationId);
    if (!prefs.handoff) return;

    const conv = await this.prisma.conversation.findUnique({
      where: { id: opts.conversationId },
      select: { metadata: true, assignedToId: true },
    });
    if (!conv) return;

    const meta = (conv.metadata ?? {}) as Record<string, unknown>;
    if (meta.handoffTaskId) return;

    const label = opts.leadName?.trim() || opts.leadPhone;
    const task = await this.prisma.task.create({
      data: {
        organizationId: opts.organizationId,
        title: `Handoff: ${label}`,
        description: `AI flagged this conversation for human follow-up (${opts.reason}).`,
        priority: "HIGH",
        status: "OPEN",
        leadId: opts.leadId,
        assignedToId: opts.assigneeUserId ?? conv.assignedToId ?? undefined,
      },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: opts.organizationId },
      select: { name: true },
    });

    const assigneeId = task.assignedToId;
    let recipients: string[] = [];
    if (assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: { email: true },
      });
      if (assignee?.email) recipients = [assignee.email];
    }
    if (recipients.length === 0) {
      recipients = await this.ownerEmails(opts.organizationId);
    }

    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");

    if (recipients.length > 0) {
      await this.email.sendHandoffAlert({
        to: recipients,
        organizationName: org?.name ?? "your workspace",
        leadLabel: label,
        reason: opts.reason,
        inboxUrl: `${appUrl}/dashboard/inbox?c=${opts.conversationId}`,
      });
    }

    await this.prisma.conversation.update({
      where: { id: opts.conversationId },
      data: {
        metadata: {
          ...meta,
          handoffTaskId: task.id,
          handoffTaskCreatedAt: new Date().toISOString(),
        },
      },
    });

    await this.logExecution(
      opts.organizationId,
      "handoff",
      "requires_human",
      `Handoff task created for ${label}`,
      opts.leadId,
    );
  }

  async logExecution(
    organizationId: string,
    automationType: string,
    trigger: string,
    result: string,
    leadId?: string,
  ) {
    await this.prisma.automationLog.create({
      data: { organizationId, automationType, trigger, result, leadId },
    });
  }

  async getRecentLogs(organizationId: string, limit = 20) {
    return this.prisma.automationLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getLogStats(organizationId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, byType] = await Promise.all([
      this.prisma.automationLog.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      this.prisma.automationLog.groupBy({
        by: ["automationType"],
        where: { organizationId, createdAt: { gte: since } },
        _count: { id: true },
      }),
    ]);
    return {
      totalRuns30d: total,
      byType: byType.map((b) => ({ type: b.automationType, count: b._count.id })),
    };
  }

  async getRunsToday(organizationId: string): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return this.prisma.automationLog.count({
      where: { organizationId, createdAt: { gte: start } },
    });
  }

  async handleManualStageChange(opts: {
    organizationId: string;
    leadId: string;
    leadName: string | null;
    leadPhone: string;
    fromStage: string;
    toStage: string;
    changedByUserId: string;
  }) {
    const prefs = await this.getPreferencesForOrg(opts.organizationId);
    const label = opts.leadName?.trim() || opts.leadPhone;

    await this.logExecution(
      opts.organizationId,
      "stage",
      "manual_stage_change",
      `Moved ${label} from ${opts.fromStage} to ${opts.toStage}`,
      opts.leadId,
    );

    if (!prefs.stageNotify) return;

    const conv = await this.prisma.conversation.findFirst({
      where: { leadId: opts.leadId },
      select: { id: true },
    });

    const changer = await this.prisma.user.findUnique({
      where: { id: opts.changedByUserId },
      select: { name: true, email: true },
    });
    const changedBy = changer?.name ?? changer?.email ?? "Team member";

    const org = await this.prisma.organization.findUnique({
      where: { id: opts.organizationId },
      select: { name: true },
    });
    const recipients = await this.ownerEmails(opts.organizationId);
    if (recipients.length === 0) return;

    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");

    await this.email.sendStageChangeAlert({
      to: recipients,
      organizationName: org?.name ?? "your workspace",
      leadLabel: label,
      fromStage: opts.fromStage,
      toStage: opts.toStage,
      changedBy,
      pipelineUrl: `${appUrl}/dashboard/pipeline`,
      inboxUrl: conv ? `${appUrl}/dashboard/inbox?c=${conv.id}` : `${appUrl}/dashboard/inbox`,
    });

    await this.logExecution(
      opts.organizationId,
      "stageNotify",
      "manual_stage_change",
      `Stage change email sent for ${label}`,
      opts.leadId,
    );
  }

  async runFollowupReminderJob() {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, name: true, settings: true },
    });

    let emailed = 0;
    let skipped = 0;
    let staleTasks = 0;

    for (const org of orgs) {
      const prefs = normalizeAutomationPreferences(
        (org.settings as Record<string, unknown>)?.automations,
      );
      if (!prefs.followup) {
        skipped++;
      } else {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stale = await this.prisma.conversation.findMany({
          where: {
            organizationId: org.id,
            status: "OPEN",
            lastInboundAt: { lt: cutoff },
            OR: [{ unreadCount: { gt: 0 } }, { assignedToId: null }],
          },
          take: 5,
          orderBy: { lastInboundAt: "asc" },
          select: {
            id: true,
            contactName: true,
            contactPhone: true,
            lastInboundAt: true,
            metadata: true,
          },
        });

        if (stale.length > 0) {
          const alreadySentToday = stale.every((c) => {
            const meta = (c.metadata ?? {}) as Record<string, unknown>;
            const sentAt = meta.followupReminderSentAt
              ? new Date(String(meta.followupReminderSentAt)).getTime()
              : 0;
            return sentAt > Date.now() - 12 * 60 * 60 * 1000;
          });

          if (!alreadySentToday) {
            const recipients = await this.ownerEmails(org.id);
            if (recipients.length > 0) {
              const appUrl = (
                this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
              ).replace(/\/$/, "");

              await this.email.sendFollowupReminder({
                to: recipients,
                organizationName: org.name,
                count: stale.length,
                inboxUrl: `${appUrl}/dashboard/inbox`,
              });

              for (const conv of stale) {
                const meta = (conv.metadata ?? {}) as Record<string, unknown>;
                await this.prisma.conversation.update({
                  where: { id: conv.id },
                  data: {
                    metadata: {
                      ...meta,
                      followupReminderSentAt: new Date().toISOString(),
                    },
                  },
                });
              }

              await this.logExecution(
                org.id,
                "followup",
                "daily_cron",
                `Follow-up reminder sent for ${stale.length} stale conversation(s)`,
              );
              emailed++;
            }
          }
        }
      }

      if (prefs.staleDeal) {
        const created = await this.runStaleDealForOrg(org.id, org.name);
        staleTasks += created;
      }
    }

    return { emailed, skipped, staleTasks, organizations: orgs.length };
  }

  /** Creates follow-up tasks for leads idle in stage or awaiting reply (Growth+ automation). */
  async runStaleDealForOrg(organizationId: string, organizationName: string): Promise<number> {
    const { OPEN_STAGES, computePipelineSignals } = await import("../leads/pipeline.helpers");

    const leads = await this.prisma.lead.findMany({
      where: { organizationId, stage: { in: OPEN_STAGES } },
      select: {
        id: true,
        stage: true,
        score: true,
        ownerId: true,
        displayName: true,
        phone: true,
        updatedAt: true,
        profile: true,
        conversation: {
          select: { id: true, lastInboundAt: true, unreadCount: true, metadata: true },
        },
      },
      take: 100,
    });

    if (leads.length === 0) return 0;

    const histories = await this.prisma.leadStageHistory.findMany({
      where: { leadId: { in: leads.map((l) => l.id) } },
      orderBy: { createdAt: "desc" },
      select: { leadId: true, toStage: true, createdAt: true },
    });
    const stageEnteredMap = new Map<string, Date>();
    for (const h of histories) {
      const lead = leads.find((l) => l.id === h.leadId);
      if (!lead || h.toStage !== lead.stage) continue;
      if (!stageEnteredMap.has(h.leadId)) stageEnteredMap.set(h.leadId, h.createdAt);
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let created = 0;

    for (const lead of leads) {
      const convMeta = (lead.conversation?.metadata ?? {}) as Record<string, unknown>;
      const signals = computePipelineSignals({
        stage: lead.stage,
        score: lead.score,
        stageEnteredAt: stageEnteredMap.get(lead.id) ?? lead.updatedAt,
        lastInboundAt: lead.conversation?.lastInboundAt,
        unreadCount: lead.conversation?.unreadCount ?? 0,
        requiresHuman: convMeta.requiresHuman === true,
        ownerId: lead.ownerId,
      });
      if (!signals.isStale) continue;

      const existing = await this.prisma.task.findFirst({
        where: {
          leadId: lead.id,
          status: "OPEN",
          title: { startsWith: "Stale deal:" },
          createdAt: { gte: weekAgo },
        },
      });
      if (existing) continue;

      const label = lead.displayName?.trim() || lead.phone;
      const profile = (lead.profile ?? {}) as Record<string, unknown>;
      const nextAction =
        typeof profile.nextAction === "string" ? profile.nextAction : null;

      await this.prisma.task.create({
        data: {
          organizationId,
          leadId: lead.id,
          title: `Stale deal: ${label}`,
          description: [
            signals.staleLabel ?? `Idle in ${lead.stage}`,
            nextAction ? `Suggested: ${nextAction}` : null,
            `Review in Pipeline and follow up in WhatsApp.`,
          ]
            .filter(Boolean)
            .join(" · "),
          priority: lead.score >= 80 ? "HIGH" : "MEDIUM",
          status: "OPEN",
          assignedToId: lead.ownerId ?? undefined,
        },
      });

      await this.logExecution(
        organizationId,
        "staleDeal",
        "daily_cron",
        `Stale deal task for ${label} (${signals.staleLabel})`,
        lead.id,
      );
      created++;
    }

    if (created > 0) {
      const recipients = await this.ownerEmails(organizationId);
      if (recipients.length > 0) {
        const appUrl = (
          this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
        ).replace(/\/$/, "");
        await this.email.sendStaleDealReminder({
          to: recipients,
          organizationName,
          count: created,
          pipelineUrl: `${appUrl}/dashboard/pipeline?filter=stale`,
          tasksUrl: `${appUrl}/dashboard/tasks`,
        });
      }
    }

    return created;
  }

  private async maybeSendHotLeadAlert(
    organizationId: string,
    opts: {
      conversationId: string;
      leadId: string;
      leadName: string | null;
      leadPhone: string;
      score: number;
      newStage: string;
    },
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: opts.conversationId },
      select: { metadata: true },
    });
    const meta = (conv?.metadata ?? {}) as Record<string, unknown>;
    const lastScore = typeof meta.lastHotLeadAlertScore === "number" ? meta.lastHotLeadAlertScore : 0;
    if (opts.score < 80 || (lastScore >= 80 && opts.score - lastScore < 5)) {
      return;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const recipients = await this.ownerEmails(organizationId);
    if (recipients.length === 0) return;

    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");

    const label = opts.leadName?.trim() || opts.leadPhone;
    await this.email.sendHotLeadAlert({
      to: recipients,
      organizationName: org?.name ?? "your workspace",
      leadLabel: label,
      score: opts.score,
      stage: opts.newStage,
      inboxUrl: `${appUrl}/dashboard/inbox?c=${opts.conversationId}`,
    });

    await this.prisma.conversation.update({
      where: { id: opts.conversationId },
      data: {
        metadata: {
          ...meta,
          lastHotLeadAlertScore: opts.score,
          lastHotLeadAlertAt: new Date().toISOString(),
        },
      },
    });
  }

  private async ownerEmails(organizationId: string): Promise<string[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
      include: { user: { select: { email: true } } },
    });
    return [...new Set(members.map((m) => m.user.email).filter(Boolean))];
  }
}
