import type { PrismaService } from "../prisma/prisma.service";

export interface CampaignRecipientStats {
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  skipped: number;
  replied: number;
}

/** Full-campaign recipient counts — never sample-limited. */
export async function aggregateCampaignRecipientStats(
  prisma: PrismaService,
  campaignId: string,
): Promise<CampaignRecipientStats> {
  const [groups, replied] = await Promise.all([
    prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { status: true },
    }),
    prisma.campaignRecipient.count({
      where: { campaignId, repliedAt: { not: null } },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of groups) {
    counts[row.status] = row._count.status;
  }

  return {
    pending: counts.PENDING ?? 0,
    sent: counts.SENT ?? 0,
    delivered: counts.DELIVERED ?? 0,
    read: counts.READ ?? 0,
    failed: counts.FAILED ?? 0,
    skipped: counts.SKIPPED ?? 0,
    replied,
  };
}

export function recipientStatsToProgress(
  totalRecipients: number,
  stats: CampaignRecipientStats,
) {
  const attempted = stats.sent + stats.delivered + stats.read + stats.failed;
  const deliveredOrRead = stats.delivered + stats.read;
  const replyPct =
    deliveredOrRead > 0 ? Math.round((stats.replied / deliveredOrRead) * 100) : 0;
  return {
    totalRecipients,
    ...stats,
    attempted,
    deliveredOrRead,
    progressPct:
      totalRecipients > 0 ? Math.round((attempted / totalRecipients) * 100) : 0,
    deliveryPct:
      totalRecipients > 0
        ? Math.round((deliveredOrRead / totalRecipients) * 100)
        : 0,
    replyPct,
  };
}
