import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { createdAtFilter, parseMetricsPeriod, type MetricsPeriod } from "../../common/date-range";

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
  ) {}

  async listByStage(user: JwtPayload) {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        conversation: {
          select: { id: true, unreadCount: true, lastMessageAt: true },
        },
        tags: { include: { tag: true } },
      },
    });

    const mapped = leads.map(({ tags, ...rest }) => ({
      ...rest,
      tags: tags.map((lt) => ({ id: lt.tag.id, name: lt.tag.name, color: lt.tag.color })),
    }));

    const grouped = mapped.reduce(
      (acc, lead) => {
        const stage = lead.stage;
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(lead);
        return acc;
      },
      {} as Record<string, typeof mapped>,
    );

    return grouped;
  }

  async updateStage(user: JwtPayload, id: string, stage: LeadStage, reason?: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

    if (lead.stage === stage) return lead;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: {
          stage: stage as never,
          wonAt: stage === "WON" ? new Date() : null,
          lostAt: stage === "LOST" ? new Date() : null,
          lostReason: stage === ("LOST" as string) ? reason ?? lead.lostReason : lead.lostReason,
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

    return updated;
  }

  async updateLead(user: JwtPayload, id: string, data: { valueCents?: number | null }) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

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
      type: "stage_change" | "ai_classify" | "automation";
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

  async getInsights(user: JwtPayload, period?: MetricsPeriod) {
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const orgId = user.organizationId;
    const leadWhere = {
      organizationId: orgId,
      ...(range.gte ? { createdAt: range } : {}),
    };

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

    const items: Array<{
      type: string;
      title: string;
      body: string;
      href: string;
      actionLabel: string;
      priority: number;
    }> = [];

    if (handoffs > 0) {
      items.push({
        type: "Urgent",
        title: `${handoffs} conversation${handoffs > 1 ? "s" : ""} need your team`,
        body: "Growvisi flagged these after classification. Follow up for complex deals.",
        href: "/dashboard/inbox",
        actionLabel: "Open conversations",
        priority: 1,
      });
    }
    if (unread > 0) {
      items.push({
        type: "Action needed",
        title: `${unread} unread message${unread > 1 ? "s" : ""}`,
        body: "Customers are waiting. Faster replies improve conversion.",
        href: "/dashboard/inbox",
        actionLabel: "Open conversations",
        priority: 2,
      });
    }
    if (stalled > 0) {
      items.push({
        type: "Pipeline",
        title: `${stalled} deal${stalled > 1 ? "s" : ""} in negotiation`,
        body: "Review classified threads and push deals toward Won.",
        href: "/dashboard/pipeline",
        actionLabel: "View Pipeline",
        priority: 3,
      });
    }
    if (funnel.total > 0 && winRate < 20) {
      items.push({
        type: "Tip",
        title: "Win rate below 20%",
        body: "Use AI-suggested replies and faster first responses.",
        href: "/dashboard/ai",
        actionLabel: "Explore Intelligence",
        priority: 4,
      });
    }
    if (funnel.total === 0) {
      items.push({
        type: "Getting started",
        title: "No leads tracked yet",
        body: "Connect WhatsApp and send a test message to see your first classified lead.",
        href: "/onboarding",
        actionLabel: "Connect WhatsApp",
        priority: 5,
      });
    }

    items.sort((a, b) => a.priority - b.priority);

    const hotLeads = await this.prisma.lead.findMany({
      where: { organizationId: orgId, score: { gte: 70 }, stage: { notIn: ["WON", "LOST"] } },
      orderBy: { score: "desc" },
      take: 5,
      select: {
        id: true, displayName: true, phone: true, score: true, stage: true,
        aiConfidence: true, profile: true,
      },
    });

    const actionLeads = hotLeads.map((lead) => {
      const profile = (lead.profile ?? {}) as Record<string, unknown>;
      return {
        id: lead.id,
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

  async exportCsv(user: JwtPayload, period?: MetricsPeriod): Promise<string> {
    const range = createdAtFilter(parseMetricsPeriod(period));
    const rows = await this.prisma.lead.findMany({
      where: {
        organizationId: user.organizationId,
        ...(range.gte ? { createdAt: range } : {}),
      },
      orderBy: { updatedAt: "desc" },
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
    if (!(await this.entitlements.canCreateLead(user.organizationId))) {
      throw new BadRequestException("Lead limit reached for your plan.");
    }

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

    return {
      ...lead,
      tags: lead.tags.map((lt) => ({ id: lt.tag.id, name: lt.tag.name, color: lt.tag.color })),
    };
  }

  async updateContact(user: JwtPayload, id: string, input: UpdateContactInput) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

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

  async addNote(user: JwtPayload, id: string, body: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException();
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
      select: { id: true },
    });
    if (!note) throw new NotFoundException();
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
