"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { AlertCircle, Lightbulb, TrendingUp, UserRound } from "lucide-react";

function InsightCardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: funnel, isLoading, isError, refetch } = useQuery({
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
      apiFetch<{
        unreadMessages: number;
        totalConversations: number;
        humanHandoffRecommended: number;
        aiClassifications: number;
      }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token,
  });

  const stalled =
    funnel?.byStage.find((s) => s.stage === "NEGOTIATION")?.count ?? 0;
  const handoffs = convStats?.humanHandoffRecommended ?? 0;
  const unread = convStats?.unreadMessages ?? 0;
  const winRate = funnel && funnel.total > 0 ? funnel.conversionRate * 100 : 0;
  const loading = isLoading || convLoading;

  const insights = [
    handoffs > 0 && {
      icon: UserRound,
      type: "Human handoff",
      title: `${handoffs} conversation${handoffs > 1 ? "s" : ""} need your team`,
      body: "Growvisi flagged these after classification. Meta Business Agent may still reply in WhatsApp — your team should follow up for complex deals.",
      action: { label: "View conversations", href: "/dashboard/inbox" },
      color: "text-warning bg-warning/10",
    },
    unread > 0 && {
      icon: AlertCircle,
      type: "Action needed",
      title: `${unread} unread message${unread > 1 ? "s" : ""}`,
      body: "Customers are waiting for a reply. Faster responses improve conversion.",
      action: { label: "Open Inbox", href: "/dashboard/inbox" },
      color: "text-warning bg-warning/10",
    },
    stalled > 0 && {
      icon: TrendingUp,
      type: "Pipeline insight",
      title: `${stalled} deal${stalled > 1 ? "s" : ""} in negotiation`,
      body: "Review classified threads and move deals forward on the pipeline.",
      action: { label: "View Pipeline", href: "/dashboard/pipeline" },
      color: "text-primary bg-primary-soft",
    },
    funnel && funnel.total > 0 && winRate < 20 && {
      icon: Lightbulb,
      type: "Tip",
      title: "Win rate below 20%",
      body: "Try AI-suggested replies and faster first responses to improve close rates.",
      action: { label: "Explore AI", href: "/dashboard/ai" },
      color: "text-primary bg-primary-soft",
    },
    funnel?.total === 0 && {
      icon: Lightbulb,
      type: "Getting started",
      title: "No leads tracked yet",
      body: "Leads are created when customer messages are ingested and classified — enable Meta Business Agent in WhatsApp for replies.",
      action: { label: "Connect WhatsApp", href: "/dashboard/settings" },
      color: "text-muted-foreground bg-muted",
    },
  ].filter(Boolean) as Array<{
    icon: typeof AlertCircle;
    type: string;
    title: string;
    body: string;
    action: { label: string; href: string };
    color: string;
  }>;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Insights"
        description="Actionable recommendations from classified WhatsApp conversations"
      />

      {isError && !loading && (
        <QueryErrorState onRetry={() => void refetch()} />
      )}

      {loading && <InsightCardSkeleton />}

      {!loading && !isError && insights.length === 0 && (
        <Card>
          <EmptyState
            icon={<Lightbulb className="h-6 w-6" />}
            title="You're on track"
            description="No urgent insights right now. Keep selling and check back after more conversations."
            actionHref="/dashboard/inbox"
            actionLabel="Open Inbox"
          />
        </Card>
      )}

      {!loading && !isError && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((item) => (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.type}
                  </p>
                  <CardTitle className="mt-1 text-base">{item.title}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                  <Button asChild size="sm" variant="link" className="mt-3 h-auto p-0">
                    <Link href={item.action.href}>{item.action.label} →</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
