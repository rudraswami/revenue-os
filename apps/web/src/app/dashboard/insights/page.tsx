"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { AlertCircle, ArrowRight, Lightbulb, TrendingUp, UserRound } from "lucide-react";
import { METRICS_PERIOD_OPTIONS, type MetricsPeriod } from "@/lib/metrics-period";
import { useState } from "react";
import { cn } from "@/lib/utils";

const iconMap = {
  Urgent: UserRound,
  "Action needed": AlertCircle,
  Pipeline: TrendingUp,
  Tip: Lightbulb,
  "Getting started": Lightbulb,
} as const;

function InsightCardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [period, setPeriod] = useState<MetricsPeriod>("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["insights", period],
    queryFn: () =>
      apiFetch<{
        period: MetricsPeriod;
        items: Array<{
          type: string;
          title: string;
          body: string;
          href: string;
          actionLabel: string;
        }>;
      }>(`/leads/metrics/insights?period=${period}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  const insights = data?.items ?? [];

  const toneFor = (type: string) => {
    switch (type) {
      case "Urgent":
        return { tone: "border-amber-200 bg-amber-50/50", iconBg: "bg-amber-100 text-amber-700" };
      case "Action needed":
        return { tone: "border-red-200/80 bg-red-50/40", iconBg: "bg-red-100 text-red-600" };
      case "Pipeline":
        return { tone: "border-[#dce9ff] bg-[#f8f9ff]", iconBg: "bg-[#ecfdf5] text-accent" };
      default:
        return { tone: "border-[#dce9ff] bg-white", iconBg: "bg-muted text-muted-foreground" };
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Recommendations"
        title="Insights"
        description="Proactive actions from classified WhatsApp conversations."
        badge={
          insights.length > 0 && !isLoading ? (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
              {insights.length} active
            </span>
          ) : undefined
        }
        action={
          <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-white p-1">
            {METRICS_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  period === opt.value
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {isError && !isLoading && <QueryErrorState onRetry={() => void refetch()} />}

      {isLoading && <InsightCardSkeleton />}

      {!isLoading && !isError && insights.length === 0 && (
        <DashboardPanel>
          <EmptyState
            icon={<Lightbulb className="h-6 w-6" />}
            title="You're on track"
            description="No urgent insights right now. Keep selling and check back after more conversations."
            actionHref="/dashboard/inbox"
            actionLabel="Open conversations"
          />
        </DashboardPanel>
      )}

      {!isLoading && !isError && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((item, i) => {
            const Icon = iconMap[item.type as keyof typeof iconMap] ?? Lightbulb;
            const { tone, iconBg } = toneFor(item.type);
            return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <DashboardPanel noPadding className={tone}>
                <div className="flex flex-row items-start gap-4 p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.type}</p>
                    <h3 className="mt-1 text-base font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    <Button asChild size="sm" variant="link" className="mt-3 h-auto p-0 text-accent">
                      <Link href={item.href} className="inline-flex items-center gap-1">
                        {item.actionLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </DashboardPanel>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
