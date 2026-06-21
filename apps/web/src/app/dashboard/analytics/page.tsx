"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { CTA } from "@/lib/brand-copy";
import { CHART_ACCENT, STAGE_CHART_COLORS, chartTooltipStyle } from "@/lib/chart-theme";
import { METRICS_PERIOD_OPTIONS, type MetricsPeriod } from "@/lib/metrics-period";
import { useAuthStore } from "@/stores/auth-store";
import { BarChart3, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [period, setPeriod] = useState<MetricsPeriod>("30d");

  const { data: funnel, isLoading: funnelLoading, isError: funnelError, refetch: refetchFunnel } = useQuery({
    queryKey: ["funnel-metrics", period],
    queryFn: () =>
      apiFetch<{
        total: number;
        won: number;
        conversionRate: number;
        period: MetricsPeriod;
        byStage: { stage: string; count: number }[];
      }>(`/leads/metrics/funnel?period=${period}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: convStats, isLoading: convLoading, isError: convError, refetch: refetchConv } = useQuery({
    queryKey: ["conversation-stats", period],
    queryFn: () =>
      apiFetch<{
        totalConversations: number;
        unreadMessages: number;
        inboundMessages: number;
        period: MetricsPeriod;
      }>(`/conversations/stats?period=${period}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const isLoading = funnelLoading || convLoading;
  const hasError = funnelError || convError;

  const chartData =
    funnel?.byStage.map((s) => ({
      name: s.stage.replace("_", " "),
      value: s.count,
    })) ?? [];

  const barData =
    funnel?.byStage.map((s) => ({
      stage: s.stage.replace("_", " "),
      count: s.count,
    })) ?? [];

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        description="Revenue metrics from your WhatsApp sales pipeline — filter by time range."
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

      {hasError && !isLoading && (
        <div className="mb-8">
          <QueryErrorState
            onRetry={() => {
              void refetchFunnel();
              void refetchConv();
            }}
          />
        </div>
      )}

      {isLoading ? (
        <>
          <MetricCardsSkeleton />
          <div className="mt-8">
            <ChartSkeleton />
          </div>
        </>
      ) : !hasError ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total leads" value={funnel?.total ?? 0} icon={<Users className="h-4 w-4" />} />
            <MetricCard title="Won deals" value={funnel?.won ?? 0} icon={<TrendingUp className="h-4 w-4" />} highlight />
            <MetricCard
              title="Win rate"
              value={funnel && funnel.total > 0 ? `${(funnel.conversionRate * 100).toFixed(0)}%` : "—"}
              icon={<Zap className="h-4 w-4" />}
            />
            <MetricCard
              title="Conversations"
              value={convStats?.totalConversations ?? 0}
              delta={`${convStats?.inboundMessages ?? 0} inbound`}
              icon={<MessageSquare className="h-4 w-4" />}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <DashboardPanel title="Leads by stage" contentClassName="h-72" delay={0.1}>
              {barData.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" fill={CHART_ACCENT} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  compact
                  className="h-full py-8"
                  icon={<BarChart3 className="h-6 w-6" />}
                  title={hasWhatsapp ? "No leads in this period" : "Connect WhatsApp first"}
                  description={
                    hasWhatsapp
                      ? "Try a wider date range or wait for new customer messages."
                      : "Link WhatsApp to start tracking pipeline metrics."
                  }
                  actionHref={hasWhatsapp ? "/dashboard/inbox" : "/onboarding"}
                  actionLabel={hasWhatsapp ? CTA.openConversations : "Connect WhatsApp"}
                />
              )}
            </DashboardPanel>

            <DashboardPanel title="Pipeline distribution" contentClassName="h-72" delay={0.15}>
              {chartData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={96}
                      paddingAngle={3}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  compact
                  className="h-full py-8"
                  icon={<TrendingUp className="h-6 w-6" />}
                  title="No pipeline data"
                  description="Stage breakdown appears once leads are created from conversations."
                  actionHref="/dashboard/pipeline"
                  actionLabel="View Pipeline"
                />
              )}
            </DashboardPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
