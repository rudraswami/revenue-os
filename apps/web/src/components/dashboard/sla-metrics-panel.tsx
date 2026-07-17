"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Settings2 } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { canManageTeam } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MetricsPeriod } from "@/lib/metrics-period";
import { cn } from "@/lib/utils";

interface SlaMetrics {
  period: MetricsPeriod;
  targetHours: number;
  sampleSize: number;
  medianLabel: string | null;
  withinSlaPercent: number | null;
  breachCount: number;
  unansweredOver24h: number;
  note: string;
  slowest: Array<{
    id: string;
    label: string;
    responseLabel: string;
    breached: boolean;
  }>;
}

export function SlaMetricsPanel({ period }: { period: MetricsPeriod }) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sla-metrics", period],
    queryFn: () =>
      apiFetch<SlaMetrics>(`/conversations/metrics/sla?period=${period}`, {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: ops } = useQuery({
    queryKey: ["ops-settings"],
    queryFn: () =>
      apiFetch<{ sla: { targetHours: number } }>("/organizations/ops-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token && isAdmin,
  });

  const updateSla = useMutation({
    mutationFn: (targetHours: number) =>
      apiFetch("/organizations/ops-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ sla: { targetHours } }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-settings"] });
      void qc.invalidateQueries({ queryKey: ["sla-metrics"] });
    },
  });

  if (isLoading) {
    return (
      <DashboardPanel title="Response time (SLA)">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </DashboardPanel>
    );
  }

  if (!data) return null;

  return (
    <DashboardPanel
      title="Response time (SLA)"
      description="How fast your team replies from Growvisi — Meta in-chat replies are separate."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat
          label="Median first reply"
          value={data.medianLabel ?? "—"}
          highlight={data.medianLabel != null}
        />
        <Stat
          label={`Within ${data.targetHours}h target`}
          value={data.withinSlaPercent != null ? `${data.withinSlaPercent}%` : "—"}
          good={(data.withinSlaPercent ?? 0) >= 80}
        />
        <Stat
          label="SLA breaches"
          value={String(data.breachCount)}
          danger={data.breachCount > 0}
        />
        <Stat
          label="Unanswered 24h+"
          value={String(data.unansweredOver24h)}
          danger={data.unansweredOver24h > 0}
        />
      </div>

      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-background p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              SLA target (hours)
            </label>
            <Select
              value={String(ops?.sla.targetHours ?? data.targetHours)}
              onChange={(e) => updateSla.mutate(Number(e.target.value))}
              className="h-9 w-32 text-sm"
              disabled={updateSla.isPending}
            >
              {[1, 2, 4, 8, 12, 24].map((h) => (
                <option key={h} value={h}>
                  {h} hour{h === 1 ? "" : "s"}
                </option>
              ))}
            </Select>
          </div>
          {updateSla.isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            <Settings2 className="mr-1 inline h-3.5 w-3.5" />
            Owners/admins only. Applies to new replies going forward.
          </p>
        </div>
      )}

      {data.sampleSize === 0 ? (
        <EmptyState
          compact
          icon={<Clock className="h-6 w-6" />}
          title="No response data yet"
          description="Send a reply from Conversations to start measuring first-response time."
          actionHref="/dashboard/inbox"
          actionLabel="Open Conversations"
        />
      ) : (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Slowest replies ({data.sampleSize} measured)
          </p>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/80">
            {data.slowest.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/dashboard/inbox?c=${row.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition hover:bg-muted/30"
                >
                  <span className="truncate font-medium">{row.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                      row.breached
                        ? "bg-destructive/10 text-destructive"
                        : "bg-bento-mint text-accent",
                    )}
                  >
                    {row.responseLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{data.note}</p>
    </DashboardPanel>
  );
}

function Stat({
  label,
  value,
  highlight,
  good,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold",
          danger ? "text-destructive" : good ? "text-accent" : highlight ? "text-foreground" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
