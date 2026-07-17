"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { trackActivation } from "@/lib/activation-analytics";
import { canManageTeam } from "@/lib/permissions";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";

const DISMISS_KEY = "growvisi-team-habit-invite-dismissed";

/**
 * Team Habit wedge: when solo + work waiting (handoffs/unassigned), invite a teammate.
 */
export function TeamHabitInviteBanner() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const [dismissed, setDismissed] = useState(true);
  const viewedRef = useRef(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<{ aiClassified: boolean }>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token && canManageTeam(role),
    staleTime: 30_000,
  });

  const { data: limits } = useQuery({
    queryKey: ["team-limits"],
    queryFn: () =>
      apiFetch<{
        memberCount: number;
        pendingInvites: number;
        canInvite: boolean;
        limit: number;
      }>("/organizations/team-limits", { token: token ?? undefined }),
    enabled: !!token && canManageTeam(role) && !!progress?.aiClassified,
    staleTime: 60_000,
  });

  const { data: workload } = useQuery({
    queryKey: QUERY_KEYS.teamWorkload,
    queryFn: () =>
      apiFetch<{ unassignedConversations: number }>("/organizations/team-workload", {
        token: token ?? undefined,
      }),
    enabled: !!token && canManageTeam(role) && !!progress?.aiClassified,
    staleTime: STALE.dashboard,
  });

  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.conversationStats(),
    queryFn: () =>
      apiFetch<{ humanHandoffRecommended: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token && canManageTeam(role) && !!progress?.aiClassified,
    staleTime: STALE.live,
  });

  const solo =
    !!limits && limits.memberCount <= 1 && (limits.pendingInvites ?? 0) === 0;
  const workWaiting =
    (stats?.humanHandoffRecommended ?? 0) > 0 ||
    (workload?.unassignedConversations ?? 0) > 0;

  const show =
    !dismissed &&
    canManageTeam(role) &&
    !!progress?.aiClassified &&
    solo &&
    workWaiting &&
    !!limits?.canInvite;

  useEffect(() => {
    if (!show || viewedRef.current) return;
    viewedRef.current = true;
    trackActivation("team_habit_invite_view", {
      surface: "home",
      handoffs: stats?.humanHandoffRecommended,
      unassigned: workload?.unassignedConversations,
    });
  }, [show, stats?.humanHandoffRecommended, workload?.unassignedConversations]);

  if (!show) return null;

  const handoffs = stats?.humanHandoffRecommended ?? 0;
  const unassigned = workload?.unassignedConversations ?? 0;
  const reason =
    handoffs > 0
      ? `${handoffs} chat${handoffs === 1 ? "" : "s"} need a human`
      : `${unassigned} unassigned conversation${unassigned === 1 ? "" : "s"}`;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce9ff] bg-gradient-to-r from-[#f8f9ff] to-white px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Invite a teammate</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {reason}. Share the queue so hot leads don’t sit on one phone.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
            trackActivation("team_habit_invite_dismiss", { surface: "home" });
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl">
          <Link
            href="/dashboard/settings?tab=team"
            onClick={() => trackActivation("team_habit_invite_click", { surface: "home" })}
          >
            Invite
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
