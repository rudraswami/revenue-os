"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingDown } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/crm";
import type { MetricsPeriod } from "@/lib/metrics-period";
import { useAuthStore } from "@/stores/auth-store";

interface LostDealMetrics {
  totalLost: number;
  lostValueCents: number;
  byReason: Array<{ reason: string; count: number }>;
}

export function LostDealsPanel({ period }: { period: MetricsPeriod }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["lost-deals", period],
    queryFn: () =>
      apiFetch<LostDealMetrics>(`/leads/metrics/lost-deals?period=${period}`, {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 120_000,
  });

  return (
    <DashboardPanel
      title="Lost deals"
      description="Why deals were marked lost — use this to fix pricing, follow-up, or fit issues."
      delay={0.2}
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !data?.totalLost ? (
        <EmptyState
          compact
          icon={<TrendingDown className="h-6 w-6" />}
          title="No lost deals in this period"
          description="When you mark deals as Lost on Pipeline, reasons appear here."
          actionHref="/dashboard/pipeline"
          actionLabel="View Pipeline"
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/80 bg-background/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Deals lost</p>
              <p className="text-xl font-bold">{data.totalLost}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-red-50/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">Lost pipeline value</p>
              <p className="text-xl font-bold text-red-800">{formatInr(data.lostValueCents)}</p>
            </div>
          </div>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/80">
            {data.byReason.map((row) => {
              const pct = Math.round((row.count / data.totalLost) * 100);
              return (
                <li
                  key={row.reason}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.reason}</p>
                    <p className="text-xs text-muted-foreground">{row.count} deals</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </DashboardPanel>
  );
}
