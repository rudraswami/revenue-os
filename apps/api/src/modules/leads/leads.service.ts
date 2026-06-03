import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload, LeadStage } from "@growthsync/shared";
import { PrismaService } from "../prisma/prisma.service";

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

  async funnelMetrics(user: JwtPayload) {
    const counts = await this.prisma.lead.groupBy({
      by: ["stage"],
      where: { organizationId: user.organizationId },
      _count: { id: true },
    });

    const total = counts.reduce((sum, c) => sum + c._count.id, 0);
    const won = counts.find((c) => c.stage === "WON")?._count.id ?? 0;

    return {
      total,
      won,
      conversionRate: total > 0 ? won / total : 0,
      byStage: counts.map((c) => ({
        stage: c.stage,
        count: c._count.id,
      })),
    };
  }
}
