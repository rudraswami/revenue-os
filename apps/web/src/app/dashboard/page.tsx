"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Inbox, Kanban, MessageSquare, TrendingUp, Users } from "lucide-react";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QueryErrorState } from "@/components/ui/query-state";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const quickActions = [
  { href: "/dashboard/inbox", label: "Open Inbox", icon: Inbox, desc: "Reply to customers" },
  { href: "/dashboard/pipeline", label: "View Pipeline", icon: Kanban, desc: "Track deal stages" },
  { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp, desc: "Sales performance" },
  { href: "/dashboard/insights", label: "Insights", icon: MessageSquare, desc: "AI recommendations" },
];

export default function DashboardPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: funnel, isLoading: funnelLoading, isError: funnelError, refetch: refetchFunnel } = useQuery({
    queryKey: ["funnel-metrics"],
    queryFn: () =>
      apiFetch<{ total: number; won: number; conversionRate: number; byStage: { stage: string; count: number }[] }>(
        "/leads/metrics/funnel",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const { data: convStats, isLoading: convLoading } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ totalConversations: number; unreadMessages: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
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
  const hasLeads = (funnel?.total ?? 0) > 0;
  const hasConversations = (convStats?.totalConversations ?? 0) > 0;

  const chartData =
    funnel?.byStage.map((s) => ({
      stage: s.stage.replace("_", " "),
      count: s.count,
    })) ?? [];

  const isLoading = funnelLoading || convLoading;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Home"
        description="Your WhatsApp sales at a glance"
      />

      <GettingStartedCard />

      {funnelError && !funnelLoading && (
        <div className="mb-8">
          <QueryErrorState onRetry={() => void refetchFunnel()} />
        </div>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <action.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {isLoading ? (
        <MetricCardsSkeleton />
      ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Conversations"
          value={hasConversations ? convStats!.totalConversations : 0}
          delta={
            hasWhatsapp
              ? `${convStats?.unreadMessages ?? 0} unread`
              : "Connect WhatsApp"
          }
          trend="neutral"
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Total leads"
          value={funnel?.total ?? 0}
          trend="neutral"
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Won"
          value={funnel?.won ?? 0}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
        />
        <MetricCard
          title="Win rate"
          value={funnel && funnel.total > 0 ? `${(funnel.conversionRate * 100).toFixed(0)}%` : "—"}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
      </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Leads by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <ChartSkeleton />
            ) : hasLeads && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="stage" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e8eaed",
                      borderRadius: 12,
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
                    }}
                  />
                  <Bar dataKey="count" fill="#6043d0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                {hasWhatsapp ? (
                  <>
                    <p>Leads appear when customers message you</p>
                    <Link href="/dashboard/inbox" className="font-medium text-primary hover:underline">
                      Open Inbox
                    </Link>
                  </>
                ) : (
                  <>
                    <p>Connect WhatsApp to start tracking leads</p>
                    <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">
                      Connect WhatsApp
                    </Link>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
