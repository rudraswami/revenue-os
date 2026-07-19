"use client";

import {
  CheckCircle2,
  Loader2,
  MessageCircleReply,
  Megaphone,
  Radio,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricCardsSkeleton } from "@/components/ui/skeleton";
import type { CampaignStatus } from "@/lib/crm";

interface CampaignRow {
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  replyCount?: number;
  deliveryPct?: number;
}

interface ReplyMetrics {
  totalReplies: number;
  replyRatePct: number;
}

export function CampaignsHubStats({
  campaigns,
  replyMetrics,
  isLoading,
}: {
  campaigns?: CampaignRow[];
  replyMetrics?: ReplyMetrics;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <MetricCardsSkeleton variant="home" />
      </div>
    );
  }

  const rows = campaigns ?? [];
  const sentCampaigns = rows.filter(
    (c) => c.status === "COMPLETED" || c.status === "RUNNING" || c.sentCount > 0,
  );
  const running = rows.filter((c) => c.status === "RUNNING").length;
  const totalSent = rows.reduce((n, c) => n + c.sentCount, 0);
  const totalDelivered = rows.reduce((n, c) => n + c.deliveredCount, 0);
  const avgDelivery =
    totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const totalReplies =
    replyMetrics?.totalReplies ?? rows.reduce((n, c) => n + (c.replyCount ?? 0), 0);

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Campaigns sent"
        value={sentCampaigns.length}
        delta={`${rows.length} total in workspace`}
        icon={<Megaphone className="h-5 w-5" />}
        variant="mint"
      />
      <MetricCard
        title="Messages sent"
        value={totalSent.toLocaleString("en-IN")}
        delta={totalDelivered > 0 ? `${totalDelivered.toLocaleString("en-IN")} delivered` : "Awaiting first send"}
        icon={<CheckCircle2 className="h-5 w-5" />}
        variant="blue"
      />
      <MetricCard
        title="Reply rate"
        value={replyMetrics?.replyRatePct ? `${replyMetrics.replyRatePct}%` : totalReplies > 0 ? "—" : "0%"}
        delta={
          totalReplies > 0
            ? `${totalReplies} ${totalReplies === 1 ? "reply" : "replies"} (30d)`
            : "Replies link to Inbox threads"
        }
        icon={<MessageCircleReply className="h-5 w-5" />}
        variant="violet"
      />
      <MetricCard
        title={running > 0 ? "Sending now" : "Delivery rate"}
        value={running > 0 ? running : `${avgDelivery}%`}
        delta={
          running > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Live progress in campaign detail
            </span>
          ) : (
            "Across completed broadcasts"
          )
        }
        icon={running > 0 ? <Radio className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        variant={running > 0 ? "amber" : "emerald"}
        urgent={running > 0}
      />
    </div>
  );
}
