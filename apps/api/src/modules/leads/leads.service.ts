import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import { DEFAULT_PIPELINE_STAGES, HOT_LEAD_SCORE_THRESHOLD, activationNextMilestone, hasCapability } from "@growvisi/shared";
import { requireLeadOwnership } from "../../common/auth/authorization";
import { PrismaService } from "../prisma/prisma.service";
import {
  readCampaignOptOut,
  readCampaignOptOutMeta,
  withCampaignOptOutProfile,
} from "../campaigns/campaign-opt-out";
import { EntitlementsService } from "../billing/entitlements.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import { AuditService } from "../audit/audit.service";
import { AutomationsService } from "../automations/automations.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ServerCacheService } from "../server-cache/server-cache.service";
import { createdAtFilter, parseMetricsPeriod, type MetricsPeriod } from "../../common/date-range";
import {
  computePipelineSignals,
  HOT_SCORE_THRESHOLD,
  OPEN_STAGES,
  readProfileSlice,
  type PipelineFilter,
} from "./pipeline.helpers";

const PIPELINE_STAGES = DEFAULT_PIPELINE_STAGES.map((s) => s.stage);

/** Hard safety caps so a large tenant can never OOM the process on a full-table scan. */
const MAX_EXPORT_ROWS = 50_000;
const MAX_STALE_SCAN_ROWS = 2_000;

const PIPELINE_LEAD_INCLUDE = {
  conversation: {
    select: {
      id: true,
      unreadCount: true,
      lastMessageAt: true,
      lastInboundAt: true,
      metadata: true,
    },
  },
  tags: { include: { tag: true } },
} as const;

export interface ContactListFilters {
  q?: string;
  stage?: LeadStage;
  tagId?: string;
  ownerId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateContactInput {
  phone: string;
  displayName?: string | null;
  email?: string | null;
  company?: string | null;
  ownerId?: string | null;
  stage?: LeadStage;
}

export interface UpdateContactInput {
  displayName?: string | null;
  email?: string | null;
  company?: string | null;
  ownerId?: string | null;
  valueCents?: number | null;
  profile?: Record<string, unknown>;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly webhooks: WebhookDispatchService,
    private readonly audit: AuditService,
    private readonly automations: AutomationsService,
    private readonly realtime: RealtimeGateway,
    private readonly serverCache: ServerCacheService,
  ) {}

  async listByStage(user: JwtPayload, filter?: PipelineFilter, perStageLimit = 40) {
    const validFilters: PipelineFilter[] = ["hot", "stale", "mine", "unassigned"];
    const activeFilter =
      filter && validFilters.includes(filter) ? filter : undefined;
    const limit = Math.min(Math.max(perStageLimit, 10), 200);
    const orgId = user.organizationId;

    const [runsToday, stageResults] = await Promise.all([
      this.automations.getRunsToday(orgId),
      this.fetchPipelineStageRows(orgId, user.sub, activeFilter, limit),
    ]);

    const allRows = stageResults.flatMap((r) => r.rows.slice(0, limit));
    if (allRows.length === 0) {
      return {
        grouped: {},
        automationRunsToday: runsToday,
        hasMoreByStage: Object.fromEntries(
          stageResults.filter((r) => r.hasMore).map((r) => [r.stage, true]),
        ),
        perStageLimit: limit,
      };
    }

    const mapped = await this.mapPipelineLeadRows(allRows);
    const byId = new Map(mapped.map((lead) => [lead.id, lead]));

    const grouped: Record<string, typeof mapped> = {};
    const hasMoreByStage: Record<string, boolean> = {};
    for (const { stage, rows, hasMore } of stageResults) {
      const stageLeads = rows
        .slice(0, limit)
        .map((row) => byId.get(row.id))
        .filter((lead): lead is (typeof mapped)[number] => lead != null);
      if (stageLeads.length > 0) grouped[stage] = stageLeads;
      if (hasMore) hasMoreByStage[stage] = true;
    }

    return { grouped, automationRunsToday: runsToday, hasMoreByStage, perStageLimit: limit };
  }

  private async fetchPipelineStageRows(
    organizationId: string,
    userId: string,
    filter: PipelineFilter | undefined,
    limit: number,
  ) {
    if (filter === "stale") {
      const staleIds = await this.listStaleLeadIds(organizationId);
      if (staleIds.length === 0) {
        return PIPELINE_STAGES.map((stage) => ({ stage, rows: [], hasMore: false }));
      }
      return this.queryPipelineStages(
        { organizationId, id: { in: staleIds } },
        limit,
      );
    }

    const baseWhere = { organizationId };
    if (filter === "mine") {
      return this.queryPipelineStages({ ...baseWhere, ownerId: userId }, limit);
    }
    if (filter === "unassigned") {
      return this.queryPipelineStages({ ...baseWhere, ownerId: null }, limit);
    }
    if (filter === "hot") {
      return this.queryPipelineStages(
        { ...baseWhere, score: { gte: HOT_SCORE_THRESHOLD } },
        limit,
      );
    }

    return this.queryPipelineStages(baseWhere, limit);
  }

  private async queryPipelineStages(
    baseWhere: { organizationId: string; [key: string]: unknown },
    limit: number,
  ) {
    return Promise.all(
      PIPELINE_STAGES.map(async (stage) => {
        const rows = await this.prisma.lead.findMany({
          where: { ...baseWhere, stage },
          orderBy: { updatedAt: "desc" },
          take: limit + 1,
          include: PIPELINE_LEAD_INCLUDE,
        });
        return { stage, rows, hasMore: rows.length > limit };
      }),
    );
  }

  private async mapPipelineLeadRows(
    leads: Array<{
      id: string;
      stage: LeadStage;
      score: number;
      ownerId: string | null;
      updatedAt: Date;
      profile: unknown;
      tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
      conversation: {
        id: string;
        unreadCount: number;
        lastMessageAt: Date | null;
        lastInboundAt: Date | null;
        metadata: unknown;
      } | null;
      [key: string]: unknown;
    }>,
  ) {
    const leadIds = leads.map((l) => l.id);
    const ownerIds = [...new Set(leads.map((l) => l.ownerId).filter(Boolean))] as string[];

    const [stageHistories, owners] = await Promise.all([
      leadIds.length > 0
        ? this.prisma.leadStageHistory.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            select: { leadId: true, toStage: true, createdAt: true },
          })
        : [],
      ownerIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, name: true, email: true },
          })
        : [],
    ]);

    const ownerMap = new Map(owners.map((o) => [o.id, o]));
    const stageEnteredMap = new Map<string, Date>();
    for (const h of stageHistories) {
      const lead = leads.find((l) => l.id === h.leadId);
      if (!lead || h.toStage !== lead.stage) continue;
      if (!stageEnteredMap.has(h.leadId)) {
        stageEnteredMap.set(h.leadId, h.createdAt);
      }
    }

    return leads.map(({ tags, conversation, profile, ownerId, ...rest }) => {
      const convMeta = (conversation?.metadata ?? {}) as Record<string, unknown>;
      const requiresHuman = convMeta.requiresHuman === true;
      const stageEnteredAt = stageEnteredMap.get(rest.id) ?? rest.updatedAt;
      const profileSlice = readProfileSlice(profile);
      const signals = computePipelineSignals({
        stage: rest.stage as LeadStage,
        score: rest.score as number,
        stageEnteredAt,
        lastInboundAt: conversation?.lastInboundAt,
        unreadCount: conversation?.unreadCount ?? 0,
        requiresHuman,
        ownerId,
      });
      const owner = ownerId ? ownerMap.get(ownerId) : null;
      const autoReplied = typeof convMeta.lastAiAutoReplyAt === "string";

      return {
        ...rest,
        ownerId,
        owner: owner
          ? { id: owner.id, name: owner.name ?? owner.email.split("@")[0] }
          : null,
        profile: profileSlice,
        conversation: conversation
          ? {
              id: conversation.id,
              unreadCount: conversation.unreadCount,
              lastInboundAt: conversation.lastInboundAt?.toISOString() ?? null,
            }
          : null,
        daysInStage: signals.daysInStage,
        isHot: signals.isHot,
        isStale: signals.isStale,
        staleLabel: signals.staleLabel,
        waitingOnTeam: signals.waitingOnTeam,
        autoReplied,
        tags: tags.map((lt) => ({ id: lt.tag.id, name: lt.tag.name, color: lt.tag.color })),
      };
    });
  }

  async getPipelineSummary(user: JwtPayload) {
    const orgId = user.organizationId;
    const [openAgg, staleLeads, runsToday, avgDays] = await Promise.all([
      this.prisma.lead.aggregate({
        where: {
          organizationId: orgId,
          stage: { in: OPEN_STAGES },
          valueCents: { not: null },
        },
        _sum: { valueCents: true },
        _count: { id: true },
      }),
      this.listStaleLeadIds(orgId),
      this.automations.getRunsToday(orgId),
      this.avgDaysInOpenStages(orgId),
    ]);

    const staleValueAgg =
      staleLeads.length > 0
        ? await this.prisma.lead.aggregate({
            where: { id: { in: staleLeads }, valueCents: { not: null } },
            _sum: { valueCents: true },
          })
        : { _sum: { valueCents: 0 } };

    const hotCount = await this.prisma.lead.count({
      where: {
        organizationId: orgId,
        stage: { in: OPEN_STAGES },
        score: { gte: 80 },
      },
    });

    const [totalLeads, autoRepliedConversations] = await Promise.all([
      this.prisma.lead.count({
        where: { organizationId: orgId },
      }),
      this.prisma.conversation.count({
        where: {
          organizationId: orgId,
          metadata: {
            path: ["lastAiAutoReplyAt"],
            not: "null",
          },
        },
      }),
    ]);

    return {
      totalLeads,
      pipelineValueCents: openAgg._sum.valueCents ?? 0,
      pipelineDealsWithValue: openAgg._count.id,
      staleCount: staleLeads.length,
      staleValueCents: staleValueAgg._sum.valueCents ?? 0,
      hotCount,
      avgDaysInStage: avgDays,
      automationRunsToday: runsToday,
      autoRepliedLeads: autoRepliedConversations,
    };
  }

  private async avgDaysInOpenStages(organizationId: string): Promise<number | null> {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId, stage: { in: OPEN_STAGES } },
      select: { id: true, stage: true, updatedAt: true },
      take: 500,
    });
    if (leads.length === 0) return null;

    const histories = await this.prisma.leadStageHistory.findMany({
      where: { leadId: { in: leads.map((l) => l.id) } },
      orderBy: { createdAt: "desc" },
      select: { leadId: true, toStage: true, createdAt: true },
    });

    const entered = new Map<string, Date>();
    for (const h of histories) {
      const lead = leads.find((l) => l.id === h.leadId);
      if (!lead || h.toStage !== lead.stage) continue;
      if (!entered.has(h.leadId)) entered.set(h.leadId, h.createdAt);
    }

    const days = leads.map((l) => {
      const at = entered.get(l.id) ?? l.updatedAt;
      return (Date.now() - at.getTime()) / 86_400_000;
    });
    return Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10;
  }

  /** Lead IDs that are stale by reply or stage-idle rules (open stages only). */
  async listStaleLeadIds(organizationId: string): Promise<string[]> {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId, stage: { in: OPEN_STAGES } },
      orderBy: { updatedAt: "asc" },
      take: MAX_STALE_SCAN_ROWS,
      select: {
        id: true,
        stage: true,
        score: true,
        ownerId: true,
        updatedAt: true,
        conversation: {
          select: { lastInboundAt: true, unreadCount: true, metadata: true },
        },
      },
    });

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

    return leads
      .filter((lead) => {
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
        return signals.isStale;
      })
      .map((l) => l.id);
  }

  async updateStage(user: JwtPayload, id: string, stage: LeadStage, reason?: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

    requireLeadOwnership(user, lead.ownerId, "move");

    if (lead.stage === stage) return lead;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: {
          stage: stage as never,
          wonAt: stage === "WON" ? new Date() : null,
          lostAt: stage === "LOST" ? new Date() : null,
          lostReason: stage === ("LOST" as string) ? reason ?? lead.lostReason : lead.lostReason,
          wonReason: stage === ("WON" as string) ? reason ?? lead.wonReason : lead.wonReason,
        },
      });

      await tx.leadStageHistory.create({
        data: {
          leadId: id,
          fromStage: lead.stage,
          toStage: stage as never,
          reason,
          changedBy: user.sub,
        },
      });

      return result;
    });

    void this.webhooks.emit(user.organizationId, "lead.stage.changed", {
      leadId: id,
      fromStage: lead.stage,
      toStage: stage,
      phone: lead.phone,
      displayName: lead.displayName,
      at: new Date().toISOString(),
    });

    const linkedConversation = await this.prisma.conversation.findFirst({
      where: { leadId: id, organizationId: user.organizationId },
      select: { id: true },
    });
    this.realtime.emitLeadStageChanged(user.organizationId, {
      leadId: id,
      fromStage: lead.stage,
      toStage: stage,
      conversationId: linkedConversation?.id,
    });

    this.audit.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: "UPDATE",
      resource: "lead",
      resourceId: id,
      metadata: { fromStage: lead.stage, toStage: stage, reason: reason ?? null },
    });

    void this.automations.handleManualStageChange({
      organizationId: user.organizationId,
      leadId: id,
      leadName: lead.displayName,
      leadPhone: lead.phone,
      fromStage: lead.stage,
      toStage: stage,
      changedByUserId: user.sub,
    });

    void this.serverCache.invalidateOnboarding(user.organizationId);

    return updated;
  }

  async updateLead(user: JwtPayload, id: string, data: { valueCents?: number | null }) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

    requireLeadOwnership(user, lead.ownerId, "value");

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(data.valueCents !== undefined ? { valueCents: data.valueCents } : {}),
      },
    });
  }

  async getTimeline(user: JwtPayload, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        stageHistory: { orderBy: { createdAt: "desc" }, take: 50 },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { name: true, email: true } } },
        },
        conversation: {
          select: {
            id: true,
            metadata: true,
            aiRuns: {
              where: { type: "classify", status: "COMPLETED" },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException();

    type TimelineEntry = {
      id: string;
      type: "stage_change" | "ai_classify" | "automation" | "note";
      at: string;
      title: string;
      detail?: string;
      metadata?: Record<string, unknown>;
    };

    const events: TimelineEntry[] = [];

    for (const entry of lead.stageHistory) {
      const isAutomation = !!entry.aiRunId && !entry.changedBy;
      events.push({
        id: entry.id,
        type: isAutomation ? "automation" : "stage_change",
        at: entry.createdAt.toISOString(),
        title: isAutomation
          ? `Automation moved stage to ${entry.toStage}`
          : entry.fromStage
            ? `${entry.fromStage} → ${entry.toStage}`
            : `Stage set to ${entry.toStage}`,
        detail: entry.reason ?? undefined,
        metadata: {
          fromStage: entry.fromStage,
          toStage: entry.toStage,
          aiRunId: entry.aiRunId,
          changedBy: entry.changedBy,
        },
      });
    }

    for (const run of lead.conversation?.aiRuns ?? []) {
      const output = run.output as {
        stage?: string;
        confidence?: number;
        intent?: string;
        requiresHuman?: boolean;
      } | null;
      events.push({
        id: run.id,
        type: "ai_classify",
        at: run.createdAt.toISOString(),
        title: "AI classified conversation",
        detail: output?.intent
          ? `${output.intent} → ${output.stage ?? "?"} (${Math.round((output.confidence ?? 0) * 100)}%)`
          : undefined,
        metadata: output ?? undefined,
      });
    }

    for (const note of lead.notes ?? []) {
      const author = note.author?.name ?? note.author?.email ?? "Team";
      const preview =
        note.body.length > 120 ? `${note.body.slice(0, 119)}…` : note.body;
      events.push({
        id: note.id,
        type: "note",
        at: note.createdAt.toISOString(),
        title: `Team note · ${author}`,
        detail: preview,
        metadata: { author },
      });
    }

    const convMeta = (lead.conversation?.metadata ?? {}) as Record<string, unknown>;
    if (convMeta.lastHotLeadAlertAt) {
      events.push({
        id: `hot-${lead.conversation!.id}`,
        type: "automation",
        at: String(convMeta.lastHotLeadAlertAt),
        title: "Hot lead alert emailed",
        detail:
          typeof convMeta.lastHotLeadAlertScore === "number"
            ? `Score ${convMeta.lastHotLeadAlertScore}`
            : undefined,
        metadata: { kind: "hot_lead_alert" },
      });
    }
    if (convMeta.lastAiAutoReplyAt) {
      events.push({
        id: `ai-reply-${lead.conversation!.id}-${convMeta.lastAiAutoReplyMessageId ?? "latest"}`,
        type: "automation",
        at: String(convMeta.lastAiAutoReplyAt),
        title: "AI sent guarded WhatsApp reply",
        detail:
          typeof convMeta.lastAiAutoReplyPreview === "string"
            ? convMeta.lastAiAutoReplyPreview
            : "Automated FAQ reply from Business Knowledge",
        metadata: { kind: "ai_auto_reply", sentByAi: true },
      });
    }
    if (convMeta.followupReminderSentAt) {
      events.push({
        id: `followup-${lead.conversation!.id}`,
        type: "automation",
        at: String(convMeta.followupReminderSentAt),
        title: "Follow-up reminder sent",
        detail: "Team notified about stale conversation",
        metadata: { kind: "followup_reminder" },
      });
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      lead: {
        id: lead.id,
        stage: lead.stage,
        score: lead.score,
        aiConfidence: lead.aiConfidence,
        lastClassifiedAt: lead.lastClassifiedAt,
        displayName: lead.displayName,
        phone: lead.phone,
        valueCents: lead.valueCents,
        currency: lead.currency,
      },
      events,
    };
  }

  async funnelMetrics(user: JwtPayload, period?: MetricsPeriod) {
    const range = createdAtFilter(parseMetricsPeriod(period));
    const counts = await this.prisma.lead.groupBy({
      by: ["stage"],
      where: {
        organizationId: user.organizationId,
        ...(range.gte ? { createdAt: range } : {}),
      },
      _count: { id: true },
    });

    const total = counts.reduce((sum, c) => sum + c._count.id, 0);
    const won = counts.find((c) => c.stage === "WON")?._count.id ?? 0;

    return {
      total,
      won,
      conversionRate: total > 0 ? won / total : 0,
      period: parseMetricsPeriod(period),
      byStage: counts.map((c) => ({
        stage: c.stage,
        count: c._count.id,
      })),
    };
  }

  async lostDealMetrics(user: JwtPayload, period?: MetricsPeriod) {
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const where = {
      organizationId: user.organizationId,
      stage: "LOST" as const,
      lostAt: {
        not: null,
        ...(range.gte ? { gte: range.gte } : {}),
      },
    };

    const [grouped, totalLost, valueAgg] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ["lostReason"],
        where,
        _count: { id: true },
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.aggregate({
        where,
        _sum: { valueCents: true },
      }),
    ]);

    return {
      period: parsedPeriod,
      totalLost,
      lostValueCents: valueAgg._sum.valueCents ?? 0,
      byReason: grouped
        .map((g) => ({
          reason: g.lostReason?.trim() || "No reason given",
          count: g._count.id,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async wonDealMetrics(user: JwtPayload, period?: MetricsPeriod) {
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const where = {
      organizationId: user.organizationId,
      stage: "WON" as const,
      wonAt: {
        not: null,
        ...(range.gte ? { gte: range.gte } : {}),
      },
    };

    const [grouped, totalWon, valueAgg] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ["wonReason"],
        where,
        _count: { id: true },
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.aggregate({
        where,
        _sum: { valueCents: true },
      }),
    ]);

    return {
      period: parsedPeriod,
      totalWon,
      wonValueCents: valueAgg._sum.valueCents ?? 0,
      byReason: grouped
        .map((g) => ({
          reason: g.wonReason?.trim() || "No reason given",
          count: g._count.id,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Razorpay payment.captured → move lead to Won when merchant webhook is configured.
   */
  async markWonFromRazorpayPayment(
    organizationId: string,
    opts: {
      leadId?: string;
      phone?: string;
      paymentId: string;
      amountCents?: number;
    },
  ) {
    let lead = opts.leadId
      ? await this.prisma.lead.findFirst({
          where: { id: opts.leadId, organizationId },
        })
      : null;

    if (!lead && opts.phone) {
      const digits = opts.phone.replace(/\D/g, "");
      if (digits.length >= 10) {
        lead = await this.prisma.lead.findFirst({
          where: { organizationId, phone: { endsWith: digits.slice(-10) } },
        });
      }
    }

    if (!lead) {
      return { matched: false, reason: "lead_not_found" as const };
    }

    if (lead.stage === "WON") {
      return { matched: true, leadId: lead.id, alreadyWon: true };
    }

    const reason = `Razorpay payment ${opts.paymentId}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead!.id },
        data: {
          stage: "WON",
          wonAt: new Date(),
          wonReason: reason,
          ...(opts.amountCents && !lead!.valueCents
            ? { valueCents: opts.amountCents }
            : {}),
        },
      });
      await tx.leadStageHistory.create({
        data: {
          leadId: lead!.id,
          fromStage: lead!.stage,
          toStage: "WON",
          reason,
        },
      });
      await tx.leadNote.create({
        data: {
          organizationId,
          leadId: lead!.id,
          body: `Deal won automatically — ${reason}${opts.amountCents ? ` (₹${(opts.amountCents / 100).toLocaleString("en-IN")})` : ""}.`,
        },
      });
    });

    void this.webhooks.emit(organizationId, "lead.stage.changed", {
      leadId: lead.id,
      fromStage: lead.stage,
      toStage: "WON",
      phone: lead.phone,
      displayName: lead.displayName,
      at: new Date().toISOString(),
      source: "razorpay_payment",
    });

    this.audit.log({
      organizationId,
      action: "UPDATE",
      resource: "lead",
      resourceId: lead.id,
      metadata: { fromStage: lead.stage, toStage: "WON", reason, paymentId: opts.paymentId },
    });

    return { matched: true, leadId: lead.id, alreadyWon: false };
  }

  async getRevenueMetrics(user: JwtPayload, period?: MetricsPeriod) {
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const orgId = user.organizationId;

    const [openAgg, wonAgg, byStageRows] = await Promise.all([
      this.prisma.lead.aggregate({
        where: {
          organizationId: orgId,
          stage: { notIn: ["WON", "LOST"] },
          valueCents: { not: null },
        },
        _sum: { valueCents: true },
        _count: { id: true },
      }),
      this.prisma.lead.aggregate({
        where: {
          organizationId: orgId,
          stage: "WON",
          ...(range.gte ? { wonAt: range } : {}),
          valueCents: { not: null },
        },
        _sum: { valueCents: true },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ["stage"],
        where: { organizationId: orgId, valueCents: { not: null } },
        _sum: { valueCents: true },
        _count: { id: true },
      }),
    ]);

    return {
      period: parsedPeriod,
      pipelineValueCents: openAgg._sum.valueCents ?? 0,
      pipelineDealsWithValue: openAgg._count.id,
      wonValueCents: wonAgg._sum.valueCents ?? 0,
      wonDealsWithValue: wonAgg._count.id,
      avgDaysToClose: await this.avgDaysToClose(orgId, range),
      byStage: byStageRows.map((r) => ({
        stage: r.stage,
        count: r._count.id,
        valueCents: r._sum.valueCents ?? 0,
      })),
    };
  }

  private async avgDaysToClose(
    organizationId: string,
    range: { gte?: Date },
  ): Promise<number | null> {
    const wonLeads = await this.prisma.lead.findMany({
      where: {
        organizationId,
        stage: "WON",
        wonAt: { not: null, ...(range.gte ? { gte: range.gte } : {}) },
      },
      select: { createdAt: true, wonAt: true },
      take: 500,
    });

    const days = wonLeads
      .filter((l) => l.wonAt)
      .map((l) => (l.wonAt!.getTime() - l.createdAt.getTime()) / 86_400_000)
      .filter((d) => d >= 0);

    if (days.length === 0) return null;
    const avg = days.reduce((sum, d) => sum + d, 0) / days.length;
    return Math.round(avg * 10) / 10;
  }

  async getInsights(user: JwtPayload, period?: MetricsPeriod) {
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const orgId = user.organizationId;
    const leadWhere = {
      organizationId: orgId,
      ...(range.gte ? { createdAt: range } : {}),
    };

    const dismissed = await this.getDismissedInsights(orgId);

    const [funnel, handoffs, unreadAgg, stalled] = await Promise.all([
      this.funnelMetrics(user, parsedPeriod),
      this.prisma.conversation.count({
        where: {
          organizationId: orgId,
          metadata: { path: ["requiresHuman"], equals: true },
        },
      }),
      this.prisma.conversation.aggregate({
        where: { organizationId: orgId },
        _sum: { unreadCount: true },
      }),
      this.prisma.lead.count({
        where: { ...leadWhere, stage: "NEGOTIATION" },
      }),
    ]);

    const unread = unreadAgg._sum.unreadCount ?? 0;
    const winRate = funnel.total > 0 ? funnel.conversionRate * 100 : 0;

    type InsightAction = {
      type: "link" | "api";
      label: string;
      href?: string;
      endpoint?: string;
      method?: string;
    };

    const items: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      href: string;
      actionLabel: string;
      priority: number;
      actions: InsightAction[];
    }> = [];

    if (handoffs > 0 && !this.isDismissed(dismissed, "handoffs")) {
      items.push({
        id: "handoffs",
        type: "Urgent",
        title: `${handoffs} conversation${handoffs > 1 ? "s" : ""} need your team`,
        body: "Growvisi flagged these after classification. Follow up for complex deals.",
        href: "/dashboard/inbox?filter=handoff",
        actionLabel: "Open handoffs",
        priority: 1,
        actions: [
          { type: "link", label: "Open handoffs", href: "/dashboard/inbox?filter=handoff" },
          {
            type: "api",
            label: "Assign to me",
            endpoint: "/leads/metrics/insights/actions/assign-handoffs",
            method: "POST",
          },
        ],
      });
    }
    if (unread > 0 && !this.isDismissed(dismissed, "unread")) {
      items.push({
        id: "unread",
        type: "Action needed",
        title: `${unread} unread message${unread > 1 ? "s" : ""}`,
        body: "Customers are waiting. Faster replies improve conversion.",
        href: "/dashboard/inbox",
        actionLabel: "Open conversations",
        priority: 2,
        actions: [{ type: "link", label: "Open conversations", href: "/dashboard/inbox" }],
      });
    }
    if (stalled > 0 && !this.isDismissed(dismissed, "stalled")) {
      items.push({
        id: "stalled",
        type: "Pipeline",
        title: `${stalled} deal${stalled > 1 ? "s" : ""} in negotiation`,
        body: "Review classified threads and push deals toward Won.",
        href: "/dashboard/pipeline",
        actionLabel: "View Pipeline",
        priority: 3,
        actions: [
          { type: "link", label: "View Pipeline", href: "/dashboard/pipeline" },
          {
            type: "api",
            label: "Create follow-up tasks",
            endpoint: "/leads/metrics/insights/actions/create-tasks",
            method: "POST",
          },
        ],
      });
    }
    if (funnel.total > 0 && winRate < 20 && !this.isDismissed(dismissed, "low_win_rate")) {
      items.push({
        id: "low_win_rate",
        type: "Tip",
        title: "Win rate below 20%",
        body: "Use AI-suggested replies and faster first responses.",
        href: "/dashboard/analytics",
        actionLabel: "View Analytics",
        priority: 4,
        actions: [{ type: "link", label: "View Analytics", href: "/dashboard/analytics" }],
      });
    }

    const [waConnected, hasInbound, hasClassified, hasPipelineMove] = await Promise.all([
      this.prisma.whatsappAccount.count({
        where: { organizationId: orgId, isActive: true },
      }),
      this.prisma.message.count({
        where: { organizationId: orgId, direction: "INBOUND" },
      }),
      this.prisma.lead.count({
        where: { organizationId: orgId, lastClassifiedAt: { not: null } },
      }),
      this.prisma.lead.count({
        where: {
          organizationId: orgId,
          OR: [
            { stage: { not: "NEW" } },
            { stageHistory: { some: { changedBy: { not: null } } } },
          ],
        },
      }),
    ]);

    const activationSteps = {
      whatsappConnected: waConnected > 0,
      firstInbound: hasInbound > 0,
      aiClassified: hasClassified > 0,
      pipelineMoved: hasPipelineMove > 0,
    };
    const nextMilestone = activationNextMilestone(activationSteps);

    if (
      nextMilestone.id !== "complete" &&
      !this.isDismissed(dismissed, "getting_started") &&
      !this.isDismissed(dismissed, `activation_${nextMilestone.id}`)
    ) {
      items.push({
        id: "getting_started",
        type: "Getting started",
        title: nextMilestone.title,
        body: nextMilestone.description,
        href: nextMilestone.href,
        actionLabel: nextMilestone.title,
        priority: handoffs > 0 || unread > 0 ? 5 : 0,
        actions: [{ type: "link", label: nextMilestone.title, href: nextMilestone.href }],
      });
    }

    const memberCount = await this.prisma.organizationMember.count({
      where: { organizationId: orgId },
    });
    if (
      handoffs > 0 &&
      memberCount <= 1 &&
      activationSteps.aiClassified &&
      !this.isDismissed(dismissed, "invite_teammate")
    ) {
      items.push({
        id: "invite_teammate",
        type: "Tip",
        title: "Invite a teammate for handoffs",
        body: "AI flagged chats that need a human. Share the queue so nothing sits on one phone.",
        href: "/dashboard/settings?tab=people",
        actionLabel: "Invite teammate",
        priority: 3,
        actions: [
          { type: "link", label: "Invite teammate", href: "/dashboard/settings?tab=people" },
        ],
      });
    }

    items.sort((a, b) => a.priority - b.priority);

    const hotLeads = await this.prisma.lead.findMany({
      where: {
        organizationId: orgId,
        score: { gte: HOT_LEAD_SCORE_THRESHOLD },
        stage: { notIn: ["WON", "LOST"] },
      },
      orderBy: { score: "desc" },
      take: 5,
      select: {
        id: true,
        displayName: true,
        phone: true,
        score: true,
        stage: true,
        aiConfidence: true,
        profile: true,
        conversation: { select: { id: true } },
      },
    });

    const actionLeads = hotLeads.map((lead) => {
      const profile = (lead.profile ?? {}) as Record<string, unknown>;
      return {
        id: lead.id,
        conversationId: lead.conversation?.id ?? null,
        name: lead.displayName ?? lead.phone,
        score: lead.score,
        stage: lead.stage,
        nextAction: profile.nextAction ?? null,
        summary: profile.summary ?? null,
        intent: profile.lastIntent ?? null,
        sentiment: profile.lastSentiment ?? null,
        tags: Array.isArray(profile.aiTags) ? profile.aiTags : [],
      };
    });

    return { period: parsedPeriod, items, actionLeads };
  }

  private async getDismissedInsights(orgId: string): Promise<Record<string, string>> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    const raw = settings.dismissedInsights;
    return raw && typeof raw === "object" ? (raw as Record<string, string>) : {};
  }

  private isDismissed(dismissed: Record<string, string>, id: string): boolean {
    const until = dismissed[id];
    if (!until) return false;
    return new Date(until).getTime() > Date.now();
  }

  async dismissInsight(user: JwtPayload, insightId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    const dismissed = (settings.dismissedInsights ?? {}) as Record<string, string>;
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          dismissedInsights: { ...dismissed, [insightId]: until },
        },
      },
    });
    return { ok: true, dismissedUntil: until };
  }

  async assignHandoffConversations(user: JwtPayload, assignToUserId?: string) {
    const targetId = assignToUserId ?? user.sub;
    await this.assertMember(user.organizationId, targetId);

    const handoffs = await this.prisma.conversation.findMany({
      where: {
        organizationId: user.organizationId,
        metadata: { path: ["requiresHuman"], equals: true },
      },
      select: { id: true },
      take: 50,
    });

    if (handoffs.length === 0) {
      return { assigned: 0 };
    }

    await this.prisma.conversation.updateMany({
      where: { id: { in: handoffs.map((h) => h.id) } },
      data: { assignedToId: targetId },
    });

    return { assigned: handoffs.length, assigneeId: targetId };
  }

  async createInsightTasks(user: JwtPayload, insightId: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    let created = 0;

    if (insightId === "stalled") {
      const leads = await this.prisma.lead.findMany({
        where: {
          organizationId: user.organizationId,
          stage: "NEGOTIATION",
        },
        take: 20,
        select: { id: true, displayName: true, phone: true, ownerId: true },
      });

      for (const lead of leads) {
        const existing = await this.prisma.task.findFirst({
          where: {
            organizationId: user.organizationId,
            leadId: lead.id,
            status: { in: ["OPEN", "IN_PROGRESS"] },
            title: { contains: "Follow up" },
          },
        });
        if (existing) continue;

        await this.prisma.task.create({
          data: {
            organizationId: user.organizationId,
            title: `Follow up: ${lead.displayName ?? lead.phone}`,
            description: "Deal in negotiation — push toward close.",
            priority: "HIGH",
            leadId: lead.id,
            assignedToId: lead.ownerId ?? user.sub,
            createdById: user.sub,
          },
        });
        created++;
      }
    } else if (insightId === "hot_leads") {
      const leads = await this.prisma.lead.findMany({
        where: {
          organizationId: user.organizationId,
          score: { gte: 70 },
          stage: { notIn: ["WON", "LOST"] },
        },
        take: 10,
        select: { id: true, displayName: true, phone: true, profile: true, ownerId: true },
      });

      for (const lead of leads) {
        const profile = (lead.profile ?? {}) as Record<string, unknown>;
        const nextAction =
          typeof profile.nextAction === "string" && profile.nextAction.trim()
            ? profile.nextAction.trim()
            : `Follow up with ${lead.displayName ?? lead.phone}`;

        await this.prisma.task.create({
          data: {
            organizationId: user.organizationId,
            title: nextAction.slice(0, 120),
            priority: "HIGH",
            leadId: lead.id,
            assignedToId: lead.ownerId ?? user.sub,
            createdById: user.sub,
          },
        });
        created++;
      }
    }

    return { created, insightId };
  }

  async createTaskForLead(user: JwtPayload, leadId: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: user.organizationId },
      select: { id: true, displayName: true, phone: true, profile: true, ownerId: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const profile = (lead.profile ?? {}) as Record<string, unknown>;
    const title =
      typeof profile.nextAction === "string" && profile.nextAction.trim()
        ? profile.nextAction.trim().slice(0, 120)
        : `Follow up: ${lead.displayName ?? lead.phone}`;

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        title,
        priority: "HIGH",
        leadId: lead.id,
        assignedToId: lead.ownerId ?? user.sub,
        createdById: user.sub,
      },
    });
    return task;
  }

  private async assertMember(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!member) throw new BadRequestException("User is not a workspace member");
  }

  async exportCsv(user: JwtPayload, period?: MetricsPeriod): Promise<string> {
    await this.entitlements.assertHasAccess(user.organizationId);
    const range = createdAtFilter(parseMetricsPeriod(period));
    const rows = await this.prisma.lead.findMany({
      where: {
        organizationId: user.organizationId,
        ...(range.gte ? { createdAt: range } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_EXPORT_ROWS,
      include: {
        tags: { include: { tag: true } },
      },
    });

    const header = [
      "name",
      "phone",
      "email",
      "company",
      "stage",
      "score",
      "value_inr",
      "tags",
      "ai_confidence",
      "source",
      "created_at",
      "last_classified_at",
    ];
    const csvRows = rows.map((l) =>
      [
        l.displayName ?? "",
        l.phone,
        l.email ?? "",
        l.company ?? "",
        l.stage,
        String(l.score),
        l.valueCents != null ? String(l.valueCents / 100) : "",
        l.tags.map((t) => t.tag.name).join("; "),
        l.aiConfidence != null ? String(l.aiConfidence) : "",
        l.source ?? "",
        l.createdAt.toISOString(),
        l.lastClassifiedAt?.toISOString() ?? "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );

    this.audit.log({
      organizationId: user.organizationId,
      userId: user.sub,
      action: "EXPORT",
      resource: "leads",
      metadata: { period: period ?? "all", rowCount: rows.length },
    });

    return [header.join(","), ...csvRows].join("\n");
  }

  // ─── Contacts (CRM) ──────────────────────────────────────────────────────

  async listContacts(user: JwtPayload, filters: ContactListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { organizationId: user.organizationId };
    if (filters.stage) where.stage = filters.stage;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };
    if (filters.q) {
      const q = filters.q.trim();
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          tags: { include: { tag: true } },
          conversation: { select: { id: true, unreadCount: true, lastMessageAt: true, status: true } },
          _count: { select: { tasks: true, notes: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const data = leads.map((l) => ({
      id: l.id,
      displayName: l.displayName,
      phone: l.phone,
      email: l.email,
      company: l.company,
      stage: l.stage,
      score: l.score,
      valueCents: l.valueCents,
      currency: l.currency,
      ownerId: l.ownerId,
      source: l.source,
      lastClassifiedAt: l.lastClassifiedAt,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      conversation: l.conversation,
      tags: l.tags.map((lt) => ({ id: lt.tag.id, name: lt.tag.name, color: lt.tag.color })),
      taskCount: l._count.tasks,
      noteCount: l._count.notes,
    }));

    return { data, total, page, pageSize, hasMore: skip + data.length < total };
  }

  async createContact(user: JwtPayload, input: CreateContactInput) {
    await this.entitlements.assertHasAccess(user.organizationId);
    await this.entitlements.assertCanCreateLead(user.organizationId);

    const phone = input.phone.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) {
      throw new BadRequestException("Enter a valid phone number with country code.");
    }

    const existing = await this.prisma.lead.findUnique({
      where: { organizationId_phone: { organizationId: user.organizationId, phone } },
    });
    if (existing) {
      throw new BadRequestException("A contact with this phone number already exists.");
    }

    if (input.ownerId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: user.organizationId, userId: input.ownerId },
      });
      if (!member) throw new NotFoundException("Owner must be a workspace member");
    }

    return this.prisma.lead.create({
      data: {
        organizationId: user.organizationId,
        phone,
        displayName: input.displayName?.trim() || null,
        email: input.email?.trim() || null,
        company: input.company?.trim() || null,
        ownerId: input.ownerId ?? null,
        stage: (input.stage ?? "NEW") as never,
        source: "manual",
      },
      include: {
        tags: { include: { tag: true } },
      },
    });
  }

  async getContact(user: JwtPayload, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        tags: { include: { tag: true } },
        conversation: {
          select: { id: true, status: true, unreadCount: true, lastMessageAt: true, aiEnabled: true },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { author: { select: { id: true, name: true, email: true } } },
        },
        tasks: {
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          take: 50,
          include: { assignedTo: { select: { id: true, name: true, email: true } } },
        },
        stageHistory: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!lead) throw new NotFoundException();

    const optMeta = readCampaignOptOutMeta(lead.profile);
    return {
      ...lead,
      tags: lead.tags.map((lt) => ({ id: lt.tag.id, name: lt.tag.name, color: lt.tag.color })),
      campaignOptOut: optMeta.optedOut,
      campaignOptOutAt: optMeta.at,
      campaignOptOutSource: optMeta.source,
    };
  }

  async setCampaignOptOut(user: JwtPayload, id: string, optedOut: boolean) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();
    requireLeadOwnership(user, lead.ownerId, "edit");

    const profile = withCampaignOptOutProfile(lead.profile, optedOut, "manual");
    return this.prisma.lead.update({
      where: { id },
      data: { profile: profile as object },
      select: {
        id: true,
        phone: true,
        displayName: true,
        profile: true,
      },
    });
  }

  async updateContact(user: JwtPayload, id: string, input: UpdateContactInput) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

    if (input.ownerId !== undefined && input.ownerId !== lead.ownerId) {
      requireLeadOwnership(user, lead.ownerId, "owner");
    }
    requireLeadOwnership(user, lead.ownerId, "edit");
    if (input.valueCents !== undefined) {
      requireLeadOwnership(user, lead.ownerId, "value");
    }

    if (input.ownerId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: user.organizationId, userId: input.ownerId },
        select: { id: true },
      });
      if (!member) throw new NotFoundException("Owner must be a workspace member");
    }

    const profile =
      input.profile !== undefined
        ? { ...((lead.profile as Record<string, unknown>) ?? {}), ...input.profile }
        : undefined;

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.company !== undefined ? { company: input.company } : {}),
        ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
        ...(input.profile !== undefined ? { profile: profile as object } : {}),
        ...(input.valueCents !== undefined ? { valueCents: input.valueCents } : {}),
      },
    });
  }

  async listNotes(user: JwtPayload, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException();

    return this.prisma.leadNote.findMany({
      where: { leadId: id, organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async addNote(user: JwtPayload, id: string, body: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, ownerId: true },
    });
    if (!lead) throw new NotFoundException();
    requireLeadOwnership(user, lead.ownerId, "edit");
    const clean = body.trim();
    if (!clean) throw new NotFoundException("Note body required");

    return this.prisma.leadNote.create({
      data: {
        organizationId: user.organizationId,
        leadId: id,
        authorId: user.sub,
        body: clean.slice(0, 4000),
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async deleteNote(user: JwtPayload, id: string, noteId: string) {
    const note = await this.prisma.leadNote.findFirst({
      where: { id: noteId, leadId: id, organizationId: user.organizationId },
      select: { id: true, authorId: true },
    });
    if (!note) throw new NotFoundException();
    const isAuthor = note.authorId === user.sub;
    const canManage = hasCapability(user.role, "team.manage");
    if (!isAuthor && !canManage) {
      throw new ForbiddenException("You can only delete your own notes.");
    }
    await this.prisma.leadNote.delete({ where: { id: noteId } });
    return { ok: true };
  }

  async getActivityFeed(user: JwtPayload, limit = 30) {
    const orgId = user.organizationId;

    const [stageChanges, aiRuns, tasks, notes, automationLogs] = await Promise.all([
      this.prisma.leadStageHistory.findMany({
        where: { lead: { organizationId: orgId } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { lead: { select: { id: true, displayName: true, phone: true } } },
      }),
      this.prisma.aiRun.findMany({
        where: { organizationId: orgId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true, type: true, output: true, createdAt: true, completedAt: true,
          conversation: { select: { contactName: true, contactPhone: true, leadId: true } },
        },
      }),
      this.prisma.task.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true, title: true, status: true, priority: true, createdAt: true, completedAt: true,
          assignedTo: { select: { name: true } },
          lead: { select: { displayName: true, phone: true } },
        },
      }),
      this.prisma.leadNote.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, body: true, createdAt: true,
          author: { select: { name: true } },
          lead: { select: { displayName: true, phone: true } },
        },
      }),
      this.prisma.automationLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    type FeedItem = { type: string; time: Date; data: Record<string, unknown> };
    const items: FeedItem[] = [];

    for (const sc of stageChanges) {
      items.push({
        type: "stage_change",
        time: sc.createdAt,
        data: {
          leadName: sc.lead?.displayName ?? sc.lead?.phone ?? "Unknown",
          leadId: sc.lead?.id,
          from: sc.fromStage, to: sc.toStage,
          reason: sc.reason,
          isAi: !!sc.aiRunId,
        },
      });
    }
    for (const ai of aiRuns) {
      const output = (ai.output ?? {}) as Record<string, unknown>;
      items.push({
        type: "ai_classification",
        time: ai.createdAt,
        data: {
          contactName: ai.conversation?.contactName ?? ai.conversation?.contactPhone,
          leadId: ai.conversation?.leadId,
          summary: output.summary, stage: output.stage,
          intent: output.intent, nextAction: output.nextAction,
        },
      });
    }
    for (const t of tasks) {
      items.push({
        type: t.completedAt ? "task_completed" : "task_created",
        time: t.completedAt ?? t.createdAt,
        data: {
          title: t.title, status: t.status, priority: t.priority,
          assignee: t.assignedTo?.name,
          leadName: t.lead?.displayName ?? t.lead?.phone,
        },
      });
    }
    for (const n of notes) {
      items.push({
        type: "note_added",
        time: n.createdAt,
        data: {
          body: n.body.slice(0, 100),
          author: n.author?.name,
          leadName: n.lead?.displayName ?? n.lead?.phone,
        },
      });
    }
    for (const log of automationLogs) {
      items.push({
        type: "automation_run",
        time: log.createdAt,
        data: {
          automationType: log.automationType,
          trigger: log.trigger,
          result: log.result,
        },
      });
    }

    items.sort((a, b) => b.time.getTime() - a.time.getTime());
    return items.slice(0, limit);
  }

  async getAgentStatus(user: JwtPayload) {
    const orgId = user.organizationId;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [classCount, latestRun, autoLogs, taskStats] = await Promise.all([
      this.prisma.aiRun.count({
        where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: since24h } },
      }),
      this.prisma.aiRun.findFirst({
        where: { organizationId: orgId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, latencyMs: true, output: true },
      }),
      this.prisma.automationLog.count({
        where: { organizationId: orgId, createdAt: { gte: since24h } },
      }),
      this.prisma.task.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
    ]);

    const latestOutput = (latestRun?.output ?? {}) as Record<string, unknown>;

    return {
      classificationsToday: classCount,
      automationsToday: autoLogs,
      lastClassifiedAt: latestRun?.createdAt,
      lastLatencyMs: latestRun?.latencyMs,
      lastSummary: latestOutput.summary,
      tasks: {
        open: taskStats.find((s) => s.status === "OPEN")?._count.id ?? 0,
        inProgress: taskStats.find((s) => s.status === "IN_PROGRESS")?._count.id ?? 0,
        done: taskStats.find((s) => s.status === "DONE")?._count.id ?? 0,
      },
    };
  }
}
