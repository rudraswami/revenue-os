"use client";

import { memo } from "react";
import { CalendarClock, ChevronRight, MessageCircleReply, Megaphone } from "lucide-react";
import {
  CAMPAIGN_STATUS_BADGE,
  CAMPAIGN_STATUS_LABELS,
  formatDate,
  formatDateTimeIst,
  type CampaignStatus,
} from "@/lib/crm";
import { cn } from "@/lib/utils";

export interface CampaignCardData {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName?: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  replyCount?: number;
  createdAt: string;
  scheduledAt?: string | null;
  deliveryPct?: number;
  replyRatePct?: number;
}

function MiniFunnel({
  deliveredPct,
  replyRatePct,
  failedPct,
  active,
}: {
  deliveredPct: number;
  replyRatePct: number;
  failedPct: number;
  active: boolean;
}) {
  if (!active) {
    return (
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 bg-muted-foreground/20" />
      </div>
    );
  }
  const remainder = Math.max(0, 100 - deliveredPct - failedPct - Math.min(replyRatePct, 20));
  return (
    <div className="mt-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted shadow-inner">
        {replyRatePct > 0 && (
          <div className="h-full bg-viz-violet" style={{ width: `${Math.min(replyRatePct, 25)}%` }} />
        )}
        <div className="h-full bg-whatsapp" style={{ width: `${deliveredPct}%` }} />
        {failedPct > 0 && (
          <div className="h-full bg-destructive/70" style={{ width: `${failedPct}%` }} />
        )}
        {remainder > 0 && (
          <div className="h-full bg-muted-foreground/15" style={{ width: `${remainder}%` }} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <strong className="text-foreground">{deliveredPct}%</strong> delivered
        </span>
        {replyRatePct > 0 && (
          <span>
            <strong className="text-viz-violet">{replyRatePct}%</strong> replied
          </span>
        )}
        {failedPct > 0 && (
          <span>
            <strong className="text-destructive">{failedPct}%</strong> failed
          </span>
        )}
      </div>
    </div>
  );
}

export const CampaignCard = memo(function CampaignCard({
  campaign,
  onSelect,
}: {
  campaign: CampaignCardData;
  onSelect: (id: string) => void;
}) {
  const c = campaign;
  const sent = c.sentCount > 0;
  const deliveredPct = c.deliveryPct ?? (c.totalRecipients > 0 && sent
    ? Math.round((c.deliveredCount / c.totalRecipients) * 100)
    : 0);
  const failedPct =
    c.totalRecipients > 0 && sent
      ? Math.round((c.failedCount / c.totalRecipients) * 100)
      : 0;
  const replyRate = c.replyRatePct ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(c.id)}
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border border-border/80 bg-card p-5 text-left elev-1 transition-all",
        "hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-lg",
        c.status === "RUNNING" && "ring-2 ring-warning/30",
      )}
    >
      {c.status === "RUNNING" && (
        <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
          </span>
          Sending
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-success text-white shadow-sm">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pr-16">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                CAMPAIGN_STATUS_BADGE[c.status],
              )}
            >
              {CAMPAIGN_STATUS_LABELS[c.status]}
            </span>
            {c.status === "SCHEDULED" && c.scheduledAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-800">
                <CalendarClock className="h-3 w-3" />
                {formatDateTimeIst(c.scheduledAt)}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-foreground group-hover:text-accent">
            {c.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {c.templateName ?? "No template"} · {formatDate(c.createdAt)}
          </p>
        </div>
      </div>

      <MiniFunnel
        deliveredPct={deliveredPct}
        replyRatePct={replyRate}
        failedPct={failedPct}
        active={sent}
      />

      <div className="mt-4 flex items-end justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex flex-wrap gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Recipients</p>
            <p className="text-lg font-bold tabular-nums">{c.totalRecipients}</p>
          </div>
          {sent && (
            <div>
              <p className="text-muted-foreground">Sent</p>
              <p className="text-lg font-bold tabular-nums">{c.sentCount}</p>
            </div>
          )}
          {(c.replyCount ?? 0) > 0 && (
            <div>
              <p className="text-muted-foreground">Replies</p>
              <p className="flex items-center gap-1 text-lg font-bold tabular-nums text-viz-violet">
                <MessageCircleReply className="h-4 w-4" />
                {c.replyCount}
              </p>
            </div>
          )}
        </div>
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent opacity-0 transition group-hover:opacity-100">
          Open
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
});
