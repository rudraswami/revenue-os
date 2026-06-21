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
import { useAuthStore } from "@/stores/auth-store";
import { BarChart3, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AnalyticsPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: funnel, isLoading: funnelLoading, isError: funnelError, refetch: refetchFunnel } = useQuery({
    queryKey: ["funnel-metrics"],
    queryFn: () =>
      apiFetch<{
        total: number;
        won: number;
        conversionRate: number;
        byStage: { stage: string; count: number }[];
      }>("/leads/metrics/funnel", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: convStats, isLoading: convLoading, isError: convError, refetch: refetchConv } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ totalConversations: number; unreadMessages: number; inboundMessages: number }>(
        "/conversations/stats",
        { token: token ?? undefined },
      ),
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
        description="Revenue metrics from your WhatsApp sales pipeline — updated as conversations are classified."
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
                  title={hasWhatsapp ? "No leads yet" : "Connect WhatsApp first"}
                  description={
                    hasWhatsapp
                      ? "Leads appear when customers message your business number."
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
