"use client";

import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";
import { cn } from "@/lib/utils";

export function WorkspaceOverview() {
  const token = useAuthStore((s) => s.accessToken);
  const organization = useAuthStore((s) => s.organization);
  const role = useAuthStore((s) => s.role);

  const { data: limits } = useQuery({
    queryKey: ["team-limits"],
    queryFn: () =>
      apiFetch<{ memberCount: number; pendingInvites: number; limit: number }>(
        "/organizations/team-limits",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () =>
      apiFetch<{ planId: string; entitlements?: { hasAccess: boolean } }>("/billing", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const planLabel =
    billing?.planId === "trial"
      ? "Trial"
      : billing?.planId
        ? billing.planId.charAt(0).toUpperCase() + billing.planId.slice(1)
        : "—";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight">
            {organization?.name ?? "Your workspace"}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{organization?.slug}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Switch workspaces from the sidebar when you belong to multiple organizations.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <StatPill label="Plan" value={planLabel} />
        <StatPill
          label="Seats"
          value={
            limits
              ? `${limits.memberCount + limits.pendingInvites}/${limits.limit}`
              : "—"
          }
          icon={Users}
        />
        {role && (
          <StatPill label="Your role" value={ROLE_LABELS[role as MembershipRole]} highlight />
        )}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: typeof Users;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-[88px] flex-col rounded-xl border px-3 py-2",
        highlight
          ? "border-accent/25 bg-accent/5"
          : "border-border/80 bg-[#f8f9ff]/60",
      )}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="mt-0.5 text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function WorkspaceOverviewLinks() {
  return (
    <p className="text-xs text-muted-foreground">
      Need more seats or numbers?{" "}
      <Link href="/dashboard/settings?tab=billing" className="font-medium text-accent underline">
        Billing
      </Link>
      {" · "}
      <Link href="/dashboard/pricing" className="font-medium text-accent underline">
        Compare plans
      </Link>
    </p>
  );
}
