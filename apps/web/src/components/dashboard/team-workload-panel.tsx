"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Inbox, ListTodo, Users } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";

interface WorkloadMember {
  userId: string;
  role: MembershipRole;
  name: string | null;
  email: string;
  openTasks: number;
  assignedConversations: number;
  handoffConversations: number;
}

interface TeamWorkload {
  members: WorkloadMember[];
  unassignedConversations: number;
}

export function TeamWorkloadPanel({ compact }: { compact?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["team-workload"],
    queryFn: () =>
      apiFetch<TeamWorkload>("/organizations/team-workload", { token: token ?? undefined }),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <DashboardPanel title="Team workload">
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      </DashboardPanel>
    );
  }

  const sorted = [...data.members].sort(
    (a, b) =>
      b.openTasks + b.assignedConversations + b.handoffConversations * 2 -
      (a.openTasks + a.assignedConversations + a.handoffConversations * 2),
  );

  if (compact) {
    const busiest = sorted[0];
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-4 w-4" />
          {data.members.length} agents
        </span>
        {data.unassignedConversations > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-amber-700">
            <AlertCircle className="h-4 w-4" />
            {data.unassignedConversations} unassigned
          </span>
        )}
        {busiest && (
          <span className="text-muted-foreground">
            Busiest: {busiest.name || busiest.email.split("@")[0]} (
            {busiest.openTasks} tasks, {busiest.assignedConversations} threads)
          </span>
        )}
      </div>
    );
  }

  return (
    <DashboardPanel title="Team workload" description="Open tasks and assigned conversations per agent">
      {data.unassignedConversations > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{data.unassignedConversations}</strong> open conversation
            {data.unassignedConversations > 1 ? "s" : ""} still unassigned
          </span>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((m) => {
          const label = m.name || m.email;
          const load = m.openTasks + m.assignedConversations + m.handoffConversations;
          return (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-3 py-2.5"
            >
              <AvatarInitials name={label} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{label}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[m.role]}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1" title="Open tasks">
                  <ListTodo className="h-3.5 w-3.5" />
                  {m.openTasks}
                </span>
                <span className="flex items-center gap-1" title="Assigned conversations">
                  <Inbox className="h-3.5 w-3.5" />
                  {m.assignedConversations}
                </span>
                {m.handoffConversations > 0 && (
                  <span className="font-medium text-amber-700" title="Handoffs">
                    {m.handoffConversations} handoff
                  </span>
                )}
                {load === 0 && <span className="text-bento-mint">Free</span>}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}
