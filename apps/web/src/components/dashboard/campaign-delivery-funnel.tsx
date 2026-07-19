"use client";

import { cn } from "@/lib/utils";

export interface CampaignDeliveryStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied?: number;
}

export function buildCampaignDeliveryStats(input: {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount?: number;
  replyCount?: number;
}): CampaignDeliveryStats {
  const read = input.readCount ?? 0;
  const sent = Math.max(0, input.sentCount - input.deliveredCount - read);
  const delivered = Math.max(0, input.deliveredCount - read);
  const pending = Math.max(
    0,
    input.totalRecipients - input.sentCount - input.failedCount,
  );
  return {
    total: input.totalRecipients,
    pending,
    sent,
    delivered,
    read,
    failed: input.failedCount,
    replied: input.replyCount ?? 0,
  };
}

const SEGMENTS = [
  { key: "replied", label: "Replied", className: "bg-violet-500" },
  { key: "read", label: "Read", className: "bg-accent" },
  { key: "delivered", label: "Delivered", className: "bg-whatsapp" },
  { key: "sent", label: "Sent", className: "bg-accent/50" },
  { key: "failed", label: "Failed", className: "bg-destructive/80" },
  { key: "pending", label: "Pending", className: "bg-muted-foreground/30" },
] as const;

/** Stacked delivery funnel with reply attribution — premium ops view. */
export function CampaignDeliveryFunnel({
  stats,
  className,
  showReplyRate = true,
}: {
  stats: CampaignDeliveryStats;
  className?: string;
  showReplyRate?: boolean;
}) {
  if (stats.total <= 0) return null;

  const deliveredOrRead = stats.delivered + stats.read;
  const replied = stats.replied ?? 0;
  const replyRatePct =
    deliveredOrRead > 0 ? Math.round((replied / deliveredOrRead) * 100) : 0;

  const parts = SEGMENTS.map((seg) => ({
    ...seg,
    count: seg.key === "replied" ? replied : stats[seg.key],
    pct: ((seg.key === "replied" ? replied : stats[seg.key]) / stats.total) * 100,
  })).filter((p) => p.count > 0);

  return (
    <div className={cn("space-y-3", className)}>
      {showReplyRate && deliveredOrRead > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-violet-200/70 bg-gradient-to-r from-violet-50/90 to-background px-3.5 py-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700/80">
              Reply rate
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {replyRatePct}%
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                ({replied} of {deliveredOrRead} reached)
              </span>
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
            {replied}
          </div>
        </div>
      )}

      <div className="flex h-3 overflow-hidden rounded-full bg-muted shadow-inner">
        {parts.map((part) => (
          <div
            key={part.key}
            className={cn("h-full transition-all duration-500", part.className)}
            style={{ width: `${part.pct}%` }}
            title={`${part.label}: ${part.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {parts.map((part) => (
          <span key={part.key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", part.className)} aria-hidden />
            {part.label}{" "}
            <strong className="font-semibold text-foreground">{part.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
