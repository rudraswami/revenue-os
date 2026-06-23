"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Inbox, Kanban, LineChart, Sparkles, TrendingUp, Users } from "lucide-react";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { AiCapabilitiesBanner, OnboardingBanner } from "@/components/dashboard/status-banners";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QueryErrorState } from "@/components/ui/query-state";
import { ChartSkeleton, MetricCardsSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA, EYEBROW, NAV } from "@/lib/brand-copy";
import { CHART_ACCENT, chartTooltipStyle } from "@/lib/chart-theme";
import { timeGreeting } from "@/lib/greeting";
import { useAuthStore } from "@/stores/auth-store";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const quickActions = [
  { href: "/dashboard/inbox", label: NAV.conversations, icon: Inbox, desc: "Reply & analyze threads", color: "bg-bento-mint text-accent" },
  { href: "/dashboard/pipeline", label: NAV.pipeline, icon: Kanban, desc: "Move deals forward", color: "bg-primary-soft text-primary" },
  { href: "/dashboard/analytics", label: NAV.analytics, icon: TrendingUp, desc: "Funnel performance", color: "bg-bento-mint text-accent" },
  { href: "/dashboard/insights", label: NAV.insights, icon: LineChart, desc: "What to do next", color: "bg-amber-50 text-amber-700" },
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

  const { data: convStats, isLoading: convLoading, isError: convError, refetch: refetchConv } = useQuery({
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
  const unread = convStats?.unreadMessages ?? 0;

  const chartData =
    funnel?.byStage.map((s) => ({
      stage: s.stage.replace("_", " "),
      count: s.count,
    })) ?? [];

  const isLoading = funnelLoading || convLoading;

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{EYEBROW.overview}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{timeGreeting(user?.name)}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Your WhatsApp revenue command center — conversations, scores, and pipeline in one place.
            </p>
            {unread > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                {unread} unread — customers waiting
              </p>
            )}
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl border-[#dce9ff] bg-white">
            <Link href="/dashboard/inbox">
              {CTA.openConversations}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <OnboardingBanner />
      <AiCapabilitiesBanner />

      <GettingStartedCard />

      {(funnelError || convError) && !isLoading && (
        <div className="mb-8">
          <QueryErrorState
            onRetry={() => {
              if (funnelError) void refetchFunnel();
              if (convError) void refetchConv();
            }}
          />
        </div>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="dashboard-quick-link group">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${action.color}`}>
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
            title="Conversations"
            value={hasConversations ? convStats!.totalConversations : 0}
            delta={`${convStats?.inboundMessages ?? 0} customer messages`}
            icon={<Inbox className="h-4 w-4" />}
            delay={0}
          />
          <MetricCard
            title="AI classifications"
            value={convStats?.aiClassifications ?? 0}
            delta={`${convStats?.classifiedLeads ?? 0} leads scored`}
            icon={<Sparkles className="h-4 w-4" />}
            delay={0.05}
            highlight
          />
          <MetricCard
            title="Pipeline leads"
            value={funnel?.total ?? 0}
            delta={funnel?.won ? `${funnel.won} won` : "Across all stages"}
            trend={funnel?.won ? "up" : "neutral"}
            icon={<Users className="h-4 w-4" />}
            delay={0.1}
          />
          <MetricCard
            title="Needs your team"
            value={convStats?.humanHandoffRecommended ?? 0}
            delta={hasWhatsapp ? "Human handoff flagged" : "Connect WhatsApp first"}
            icon={<TrendingUp className="h-4 w-4" />}
            delay={0.15}
          />
        </div>
      )}

      <div className="mt-8">
        <DashboardPanel
          title="Leads by stage"
          description="Pipeline distribution from classified WhatsApp conversations"
          contentClassName="h-72"
          delay={0.2}
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : hasLeads && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData}>
                <XAxis dataKey="stage" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill={CHART_ACCENT} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              {hasWhatsapp ? (
                <>
                  <p>Leads appear when customer messages are classified</p>
                  <Link href="/dashboard/inbox" className="font-medium text-accent hover:underline">
                    {CTA.openConversations} →
                  </Link>
                </>
              ) : (
                <>
                  <p>Connect WhatsApp to start tracking revenue</p>
                  <Link href="/onboarding" className="font-medium text-accent hover:underline">
                    Connect WhatsApp →
                  </Link>
                </>
              )}
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
