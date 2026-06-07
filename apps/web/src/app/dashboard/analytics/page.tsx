"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
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

  const { data: funnel, isLoading: funnelLoading } = useQuery({
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

  const { data: convStats, isLoading: convLoading } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ totalConversations: number; unreadMessages: number; inboundMessages: number }>(
        "/conversations/stats",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const isLoading = funnelLoading || convLoading;
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
    <div className="p-6 md:p-8">
      <PageHeader
        title="Analytics"
        description="Understand your WhatsApp sales performance"
      />

      {isLoading ? (
        <>
          <MetricCardsSkeleton />
          <Card className="mt-8">
            <CardContent className="pt-6">
              <ChartSkeleton />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total leads"
              value={funnel?.total ?? 0}
              icon={<Users className="h-4 w-4 text-primary" />}
            />
            <MetricCard
              title="Won deals"
              value={funnel?.won ?? 0}
              icon={<TrendingUp className="h-4 w-4 text-success" />}
            />
            <MetricCard
              title="Win rate"
              value={
                funnel && funnel.total > 0
                  ? `${(funnel.conversionRate * 100).toFixed(0)}%`
                  : "—"
              }
              icon={<Zap className="h-4 w-4 text-primary" />}
            />
            <MetricCard
              title="Conversations"
              value={convStats?.totalConversations ?? 0}
              delta={`${convStats?.inboundMessages ?? 0} inbound`}
              icon={<MessageSquare className="h-4 w-4 text-primary" />}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads by stage</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6043d0" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                    <p>No lead data yet</p>
                    <Button asChild size="sm" variant="link" className="mt-2">
                      <Link href="/dashboard/inbox">Open Inbox</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline distribution</CardTitle>
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
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Pipeline chart appears when you have leads
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
