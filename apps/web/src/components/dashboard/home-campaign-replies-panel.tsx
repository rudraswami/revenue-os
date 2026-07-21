"use client";

import Link from "next/link";
import { Megaphone, MessageCircleReply } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { apiFetch } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

interface CampaignReplyMetrics {
  periodDays: number;
  totalReplies: number;
  replyRatePct: number;
  topCampaigns: Array<{
    id: string;
    name: string;
    replyCount: number;
    replyRatePct: number;
  }>;
}

/** Home strip — campaign replies driving pipeline conversations. */
export function HomeCampaignRepliesPanel({ enabled }: { enabled: boolean }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["campaign-reply-metrics"],
    queryFn: () =>
      apiFetch<CampaignReplyMetrics>("/campaigns/metrics/replies", {
        token: token ?? undefined,
      }),
    enabled: enabled && !!token,
    staleTime: 60_000,
  });

  if (!enabled || isLoading) {
    if (!enabled) return null;
    return (
      <DashboardPanel title="Campaign replies" className="animate-pulse">
        <div className="h-16 rounded-lg bg-muted" />
      </DashboardPanel>
    );
  }

  if (!data || (data.totalReplies === 0 && data.topCampaigns.length === 0)) {
    return null;
  }

  return (
    <DashboardPanel
      title="Campaign replies"
      action={
        <Link
          href="/dashboard/campaigns"
          className="text-xs font-medium text-accent hover:underline"
        >
          All campaigns
        </Link>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-viz-violet/15 text-viz-violet">
            <MessageCircleReply className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {data.totalReplies}
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                replies · last {data.periodDays}d
              </span>
            </p>
            {data.replyRatePct > 0 && (
              <p className="text-xs text-muted-foreground">
                {data.replyRatePct}% reply rate on delivered campaigns
              </p>
            )}
          </div>
        </div>
        {data.topCampaigns.length > 0 && (
          <ul className="min-w-0 flex-1 space-y-1.5 border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            {data.topCampaigns.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns?campaign=${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-viz-violet">
                    {c.replyCount} replies
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardPanel>
  );
}
