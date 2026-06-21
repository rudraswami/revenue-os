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
import { CTA } from "@/lib/brand-copy";
import { useAuthStore } from "@/stores/auth-store";
import { AlertCircle, ArrowRight, Lightbulb, TrendingUp, UserRound } from "lucide-react";

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
      }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token,
  });

  const stalled = funnel?.byStage.find((s) => s.stage === "NEGOTIATION")?.count ?? 0;
  const handoffs = convStats?.humanHandoffRecommended ?? 0;
  const unread = convStats?.unreadMessages ?? 0;
  const winRate = funnel && funnel.total > 0 ? funnel.conversionRate * 100 : 0;
  const loading = isLoading || convLoading;

  const insights = [
    handoffs > 0 && {
      icon: UserRound,
      type: "Urgent",
      title: `${handoffs} conversation${handoffs > 1 ? "s" : ""} need your team`,
      body: "Growvisi flagged these after classification. Follow up for complex deals.",
      action: { label: CTA.openConversations, href: "/dashboard/inbox" },
      tone: "border-amber-200 bg-amber-50/50",
      iconBg: "bg-amber-100 text-amber-700",
    },
    unread > 0 && {
      icon: AlertCircle,
      type: "Action needed",
      title: `${unread} unread message${unread > 1 ? "s" : ""}`,
      body: "Customers are waiting. Faster replies improve conversion.",
      action: { label: CTA.openConversations, href: "/dashboard/inbox" },
      tone: "border-red-200/80 bg-red-50/40",
      iconBg: "bg-red-100 text-red-600",
    },
    stalled > 0 && {
      icon: TrendingUp,
      type: "Pipeline",
      title: `${stalled} deal${stalled > 1 ? "s" : ""} in negotiation`,
      body: "Review classified threads and push deals toward Won.",
      action: { label: "View Pipeline", href: "/dashboard/pipeline" },
      tone: "border-[#dce9ff] bg-[#f8f9ff]",
      iconBg: "bg-[#ecfdf5] text-accent",
    },
    funnel && funnel.total > 0 && winRate < 20 && {
      icon: Lightbulb,
      type: "Tip",
      title: "Win rate below 20%",
      body: "Use AI-suggested replies and faster first responses.",
      action: { label: "Explore Intelligence", href: "/dashboard/ai" },
      tone: "border-[#dce9ff] bg-white",
      iconBg: "bg-[#e5eeff] text-primary",
    },
    funnel?.total === 0 && {
      icon: Lightbulb,
      type: "Getting started",
      title: "No leads tracked yet",
      body: "Connect WhatsApp and send a test message to see your first classified lead.",
      action: { label: "Connect WhatsApp", href: "/onboarding" },
      tone: "border-[#dce9ff] bg-white",
      iconBg: "bg-muted text-muted-foreground",
    },
  ].filter(Boolean) as Array<{
    icon: typeof AlertCircle;
    type: string;
    title: string;
    body: string;
    action: { label: string; href: string };
    tone: string;
    iconBg: string;
  }>;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Recommendations"
        title="Insights"
        description="Proactive actions from your classified WhatsApp conversations — updated live."
        badge={
          insights.length > 0 && !loading ? (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
              {insights.length} active
            </span>
          ) : undefined
        }
      />

      {isError && !loading && <QueryErrorState onRetry={() => void refetch()} />}

      {loading && <InsightCardSkeleton />}

      {!loading && !isError && insights.length === 0 && (
        <DashboardPanel>
          <EmptyState
            icon={<Lightbulb className="h-6 w-6" />}
            title="You're on track"
            description="No urgent insights right now. Keep selling and check back after more conversations."
            actionHref="/dashboard/inbox"
            actionLabel={CTA.openConversations}
          />
        </DashboardPanel>
      )}

      {!loading && !isError && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <DashboardPanel noPadding className={item.tone}>
                <div className="flex flex-row items-start gap-4 p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.type}</p>
                    <h3 className="mt-1 text-base font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    <Button asChild size="sm" variant="link" className="mt-3 h-auto p-0 text-accent">
                      <Link href={item.action.href} className="inline-flex items-center gap-1">
                        {item.action.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </DashboardPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
