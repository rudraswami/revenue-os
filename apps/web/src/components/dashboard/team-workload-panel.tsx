"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, ArrowRight, Inbox, ListTodo, Users } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";
import { cn } from "@/lib/utils";

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
    return compact ? (
      <div className="h-14 animate-pulse rounded-2xl bg-muted/60" />
    ) : (
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
    );
  }

  const sorted = [...data.members].sort(
    (a, b) =>
      b.openTasks + b.assignedConversations + b.handoffConversations * 2 -
      (a.openTasks + a.assignedConversations + a.handoffConversations * 2),
  );

  if (compact) {
    const busiest = sorted[0];
    const hasAlert = data.unassignedConversations > 0;

    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          hasAlert
            ? "border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-white to-white"
            : "border-[#dce9ff] bg-white",
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Team workload</p>
              <p className="text-[11px] text-muted-foreground">
                {data.members.length} agent{data.members.length === 1 ? "" : "s"} on duty
              </p>
            </div>
          </div>

          {hasAlert && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              <AlertCircle className="h-3.5 w-3.5" />
              {data.unassignedConversations} unassigned
            </span>
          )}

          {busiest && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AvatarInitials
                name={busiest.name || busiest.email}
                className="h-7 w-7 text-[10px]"
              />
              <span>
                Busiest: <strong className="text-foreground">{busiest.name || busiest.email.split("@")[0]}</strong>
                {" · "}
                {busiest.openTasks} tasks, {busiest.assignedConversations} threads
              </span>
            </div>
          )}
        </div>

        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          View tasks
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#dce9ff] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Team</p>
          <h3 className="text-base font-bold">Workload</h3>
        </div>
        <Link href="/dashboard/tasks" className="text-xs font-semibold text-accent hover:underline">
          Tasks →
        </Link>
      </div>

      {data.unassignedConversations > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{data.unassignedConversations}</strong> open conversation
            {data.unassignedConversations > 1 ? "s" : ""} still unassigned —{" "}
            <Link href="/dashboard/inbox" className="font-semibold underline">
              assign in inbox
            </Link>
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
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-[#f8f9ff]/50 px-3 py-2.5"
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
                  <span className="font-medium text-rose-600" title="Handoffs">
                    {m.handoffConversations} handoff
                  </span>
                )}
                {load === 0 && <span className="font-medium text-emerald-600">Free</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
