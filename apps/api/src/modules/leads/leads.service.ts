import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { createdAtFilter, parseMetricsPeriod, type MetricsPeriod } from "../../common/date-range";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByStage(user: JwtPayload) {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        conversation: {
          select: { id: true, unreadCount: true, lastMessageAt: true },
        },
      },
    });

    const grouped = leads.reduce(
      (acc, lead) => {
        const stage = lead.stage;
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(lead);
        return acc;
      },
      {} as Record<string, typeof leads>,
    );

    return grouped;
  }

  async updateStage(user: JwtPayload, id: string, stage: LeadStage, reason?: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!lead) throw new NotFoundException();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: {
          stage: stage as never,
          wonAt: stage === "WON" ? new Date() : lead.wonAt,
          lostAt: stage === "LOST" ? new Date() : lead.lostAt,
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

  async getTimeline(user: JwtPayload, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        stageHistory: { orderBy: { createdAt: "desc" }, take: 50 },
        conversation: {
          select: {
            id: true,
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
      type: "stage_change" | "ai_classify";
      at: string;
      title: string;
      detail?: string;
      metadata?: Record<string, unknown>;
    };

    const events: TimelineEntry[] = [];

    for (const entry of lead.stageHistory) {
      events.push({
        id: entry.id,
        type: "stage_change",
        at: entry.createdAt.toISOString(),
        title: entry.fromStage
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

    return { period: parsedPeriod, items };
  }
}
