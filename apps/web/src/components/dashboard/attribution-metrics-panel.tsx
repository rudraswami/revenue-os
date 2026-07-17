"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Link2, TrendingUp } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface CampaignMetric {
  campaign: string;
  leads: number;
  won: number;
}

export function AttributionMetricsPanel() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["tracking-metrics"],
    queryFn: () =>
      apiFetch<CampaignMetric[]>("/tracking/metrics", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 120_000,
  });

  const rows = data ?? [];
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalWon = rows.reduce((s, r) => s + r.won, 0);

  return (
    <DashboardPanel
      title="Campaign attribution"
      description="Leads and wins from tracked WhatsApp links (UTM campaigns)."
      delay={0.15}
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={<Link2 className="h-6 w-6" />}
          title="No tracked campaigns yet"
          description="Create tracking links in Settings → Growth to attribute leads from ads and QR codes."
          actionHref="/dashboard/settings?tab=growth"
          actionLabel="Create tracking link"
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/80 bg-background/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Attributed leads</p>
              <p className="text-xl font-bold">{totalLeads.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-bento-mint/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">Won from links</p>
              <p className="text-xl font-bold text-whatsapp">{totalWon.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/80">
            {rows.map((row) => {
              const winRate = row.leads > 0 ? Math.round((row.won / row.leads) * 100) : 0;
              return (
                <li
                  key={row.campaign}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.campaign || "(unnamed)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.leads} leads · {row.won} won
                    </p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                    <TrendingUp className="h-3 w-3" />
                    {winRate}% win
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link href="/dashboard/settings?tab=growth" className="font-medium text-accent hover:underline">
              Manage tracking links in Settings → Growth
            </Link>
          </p>
        </>
      )}
    </DashboardPanel>
  );
}
