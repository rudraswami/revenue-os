"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { SlaMetricsPanel } from "@/components/dashboard/sla-metrics-panel";
import { AttributionMetricsPanel } from "@/components/dashboard/attribution-metrics-panel";
import { LostDealsPanel } from "@/components/dashboard/lost-deals-panel";
import { WonDealsPanel } from "@/components/dashboard/won-deals-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { CTA } from "@/lib/brand-copy";
import { formatInr } from "@/lib/crm";
import { CHART_ACCENT, chartTooltipStyle } from "@/lib/chart-theme";
import { METRICS_PERIOD_OPTIONS, type MetricsPeriod } from "@/lib/metrics-period";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";
import { BarChart3, IndianRupee, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [period, setPeriod] = useState<MetricsPeriod>("30d");

  const { data: funnel, isLoading: funnelLoading, isError: funnelError, refetch: refetchFunnel } = useQuery({
    queryKey: QUERY_KEYS.funnel(period),
    queryFn: () =>
      apiFetch<{
        total: number;
        won: number;
        conversionRate: number;
        period: MetricsPeriod;
        byStage: { stage: string; count: number }[];
      }>(`/leads/metrics/funnel?period=${period}`, { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.metrics,
    placeholderData: (prev) => prev,
  });

  const { data: convStats, isLoading: convLoading, isError: convError, refetch: refetchConv } = useQuery({
    queryKey: QUERY_KEYS.conversationStats(period),
    queryFn: () =>
      apiFetch<{
        totalConversations: number;
        unreadMessages: number;
        inboundMessages: number;
        period: MetricsPeriod;
      }>(`/conversations/stats?period=${period}`, { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.metrics,
    placeholderData: (prev) => prev,
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: QUERY_KEYS.revenue(period),
    queryFn: () =>
      apiFetch<{
        pipelineValueCents: number;
        wonValueCents: number;
        pipelineDealsWithValue: number;
        wonDealsWithValue: number;
        byStage: Array<{ stage: string; count: number; valueCents: number }>;
      }>(`/leads/metrics/revenue?period=${period}`, { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.metrics,
    placeholderData: (prev) => prev,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: QUERY_KEYS.whatsappAccounts,
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: STALE.config,
    placeholderData: (prev) => prev,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const isLoading = funnelLoading || convLoading || revenueLoading;
  const hasError = funnelError || convError;

  const barData =
    funnel?.byStage.map((s) => ({
      stage: s.stage.replace("_", " "),
      count: s.count,
    })) ?? [];

  const valueBarData =
    revenue?.byStage
      .filter((s) => s.valueCents > 0)
      .map((s) => ({
        stage: s.stage.replace("_", " "),
        value: s.valueCents / 100,
      })) ?? [];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Analytics"
        description="Revenue and response metrics from your WhatsApp sales pipeline."
        action={
          <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-card p-1">
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
            <MetricCard
              title="Open pipeline"
              value={formatInr(revenue?.pipelineValueCents)}
              delta={`${revenue?.pipelineDealsWithValue ?? 0} deals with value`}
              icon={<IndianRupee className="h-4 w-4" />}
              highlight
            />
            <MetricCard
              title="Won revenue"
              value={formatInr(revenue?.wonValueCents)}
              delta={`${revenue?.wonDealsWithValue ?? 0} won in period`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard title="Total leads" value={funnel?.total ?? 0} icon={<Users className="h-4 w-4" />} />
            <MetricCard
              title="Win rate"
              value={funnel && funnel.total > 0 ? `${(funnel.conversionRate * 100).toFixed(0)}%` : "—"}
              icon={<Zap className="h-4 w-4" />}
            />
          </div>

          <div className="mt-8">
            <SlaMetricsPanel period={period} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <DashboardPanel title="Leads by stage" contentClassName="h-72" delay={0.1}>
              {barData.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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

            <DashboardPanel title="Pipeline value by stage (₹)" contentClassName="h-72" delay={0.15}>
              {valueBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={valueBarData}>
                    <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number) => [
                        new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(v),
                        "Value",
                      ]}
                    />
                    <Bar dataKey="value" fill="#006c49" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  compact
                  className="h-full py-8"
                  icon={<IndianRupee className="h-6 w-6" />}
                  title="No deal values yet"
                  description="Add ₹ values on Pipeline or Contacts to see revenue by stage."
                  actionHref="/dashboard/pipeline"
                  actionLabel="View Pipeline"
                />
              )}
            </DashboardPanel>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <WonDealsPanel period={period} />
            <LostDealsPanel period={period} />
          </div>

          <div className="mt-8">
            <AttributionMetricsPanel />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Conversations"
              value={convStats?.totalConversations ?? 0}
              delta={`${convStats?.inboundMessages ?? 0} inbound in period`}
              icon={<MessageSquare className="h-4 w-4" />}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
