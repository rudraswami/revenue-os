"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA } from "@/lib/brand-copy";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Return-to-work interrupt: when activation is past first classify,
 * surface handoffs / hot work waiting — deep-link to Conversations.
 */
export function ReturnToWorkBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<{ aiClassified: boolean }>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: STALE.dashboard,
  });

  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.conversationStats(),
    queryFn: () =>
      apiFetch<{
        humanHandoffRecommended: number;
        unreadMessages: number;
      }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token && !!progress?.aiClassified,
    staleTime: STALE.live,
  });

  if (!progress?.aiClassified || !stats) return null;

  const handoffs = stats.humanHandoffRecommended ?? 0;
  const unread = stats.unreadMessages ?? 0;
  if (handoffs <= 0 && unread <= 0) return null;

  const href =
    handoffs > 0 ? "/dashboard/inbox?filter=handoff" : "/dashboard/inbox";
  const title =
    handoffs > 0
      ? `${handoffs} conversation${handoffs === 1 ? "" : "s"} need your team`
      : `${unread} unread message${unread === 1 ? "" : "s"} waiting`;
  const subtitle =
    handoffs > 0
      ? "AI flagged these for human follow-up. Reply from Conversations."
      : "Customers are waiting — faster replies improve conversion.";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-card elev-1 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        {handoffs > 0 ? (
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
        ) : (
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button asChild size="sm" className="h-8 shrink-0 gap-1.5 rounded-xl">
        <Link href={href}>
          {CTA.openConversations}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
