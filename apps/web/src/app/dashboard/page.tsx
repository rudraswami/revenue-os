"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Inbox, Kanban, LineChart, Sparkles, TrendingUp, Users } from "lucide-react";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { MetaAiNotice } from "@/components/dashboard/meta-ai-notice";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QueryErrorState } from "@/components/ui/query-state";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { timeGreeting } from "@/lib/greeting";
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
  { href: "/dashboard/inbox", label: "Conversations", icon: Inbox, desc: "Analyze customer threads" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban, desc: "Track deal stages" },
  { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp, desc: "Funnel performance" },
  { href: "/dashboard/ai", label: "Intelligence", icon: LineChart, desc: "Classification & scoring" },
];

export default function DashboardPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

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
      apiFetch<{
        totalConversations: number;
        unreadMessages: number;
        inboundMessages: number;
        aiClassifications: number;
        classifiedLeads: number;
        humanHandoffRecommended: number;
      }>("/conversations/stats", { token: token ?? undefined }),
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
    <div className="dashboard-page">
      <div className="mb-8 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-white via-white to-primary-soft/40 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Overview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              {timeGreeting(user?.name)}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              WhatsApp conversation intelligence — track leads from first message to revenue.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5 bg-white/80">
            <Link href="/dashboard/inbox">
              Open conversations
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <MetaAiNotice />
      </div>

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
            className="card-interactive group flex items-center gap-4 p-4"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary group-hover:text-white group-hover:shadow-md">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="truncate text-xs text-muted-foreground">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {isLoading ? (
        <MetricCardsSkeleton />
      ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Conversations tracked"
          value={hasConversations ? convStats!.totalConversations : 0}
          delta={`${convStats?.inboundMessages ?? 0} customer messages ingested`}
          trend="neutral"
          icon={<Inbox className="h-4 w-4" />}
        />
        <MetricCard
          title="AI classifications"
          value={convStats?.aiClassifications ?? 0}
          delta={`${convStats?.classifiedLeads ?? 0} leads scored`}
          trend="neutral"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <MetricCard
          title="Total leads"
          value={funnel?.total ?? 0}
          trend="neutral"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Human handoffs"
          value={convStats?.humanHandoffRecommended ?? 0}
          delta={hasWhatsapp ? "Needs your team" : "Connect WhatsApp"}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
      )}

      <div className="mt-8">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base">Leads by stage</CardTitle>
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
                    <p>Leads appear when customer messages are classified</p>
                    <Link href="/dashboard/inbox" className="font-medium text-primary hover:underline">
                      View conversations
                    </Link>
                  </>
                ) : (
                  <>
                    <p>Connect WhatsApp to start tracking conversations</p>
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
