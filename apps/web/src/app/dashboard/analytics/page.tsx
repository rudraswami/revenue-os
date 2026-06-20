"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { BarChart3, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STAGE_COLORS = ["#6043d0", "#7c5ce0", "#9b7bff", "#f59e0b", "#f97316", "#0d9f6e", "#9ca3af"];

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
        description="Understand your WhatsApp sales performance at a glance."
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
          <Card className="mt-8">
            <CardContent className="pt-6">
              <ChartSkeleton />
            </CardContent>
          </Card>
        </>
      ) : !hasError ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total leads"
              value={funnel?.total ?? 0}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              title="Won deals"
              value={funnel?.won ?? 0}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              title="Win rate"
              value={
                funnel && funnel.total > 0
                  ? `${(funnel.conversionRate * 100).toFixed(0)}%`
                  : "—"
              }
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
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base">Leads by stage</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {barData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6043d0" radius={[6, 6, 0, 0]} />
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
                        : "Link WhatsApp to start tracking leads and pipeline metrics."
                    }
                    actionHref={hasWhatsapp ? "/dashboard/inbox" : "/dashboard/settings"}
                    actionLabel={hasWhatsapp ? "Open Inbox" : "Connect WhatsApp"}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base">Pipeline distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {chartData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.filter((d) => d.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    compact
                    className="h-full py-8"
                    icon={<TrendingUp className="h-6 w-6" />}
                    title="No pipeline data"
                    description="Your stage breakdown will appear once leads are created from conversations."
                    actionHref="/dashboard/pipeline"
                    actionLabel="View Pipeline"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
