"use client";

import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import type { MembershipRole } from "@growvisi/shared";
import { cn } from "@/lib/utils";

type BillingBootstrap = ShellBootstrapResponse["billing"] & { planId?: string };

interface WorkspaceOverviewProps {
  bootstrap?: ShellBootstrapResponse;
  bootstrapLoading?: boolean;
}

export function WorkspaceOverview({ bootstrap, bootstrapLoading }: WorkspaceOverviewProps) {
  const organization = useAuthStore((s) => s.organization);
  const role = useAuthStore((s) => s.role);

  const billing = bootstrap?.billing as BillingBootstrap | undefined;
  const limits = bootstrap?.billing?.limits;
  const usage = bootstrap?.billing?.usage;

  const planLabel = bootstrapLoading
    ? null
    : billing?.planId === "trial"
      ? "Trial"
      : billing?.planId
        ? billing.planId.charAt(0).toUpperCase() + billing.planId.slice(1)
        : "—";

  const seatsLabel =
    usage && limits
      ? `${usage.teamMembers}/${limits.teamMembers}`
      : bootstrapLoading
        ? null
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
          <p className="mt-2 text-sm text-muted-foreground">
            Switch workspaces from the sidebar when you belong to multiple organizations.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <StatPill label="Plan" value={planLabel} loading={bootstrapLoading} />
        <StatPill
          label="Seats"
          value={seatsLabel}
          icon={Users}
          loading={bootstrapLoading}
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
  loading,
}: {
  label: string;
  value: string | null;
  icon?: typeof Users;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-[88px] flex-col rounded-xl border px-3 py-2",
        highlight
          ? "border-accent/25 bg-accent/5"
          : "border-border/80 bg-background/60",
      )}
    >
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      {loading || value === null ? (
        <Skeleton className="mt-1.5 h-4 w-14" />
      ) : (
        <span className="mt-0.5 text-sm font-semibold text-foreground">{value}</span>
      )}
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
