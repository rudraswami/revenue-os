"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Inbox,
  Kanban,
  Megaphone,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { AiCapabilitiesBanner, OnboardingBanner } from "@/components/dashboard/status-banners";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QueryErrorState } from "@/components/ui/query-state";
import { MetricCardsSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA, EYEBROW, NAV } from "@/lib/brand-copy";
import { timeGreeting } from "@/lib/greeting";
import { useAuthStore } from "@/stores/auth-store";

const quickActions = [
  { href: "/dashboard/inbox", label: NAV.conversations, icon: Inbox, desc: "Reply & analyze threads", color: "bg-bento-mint text-accent" },
  { href: "/dashboard/pipeline", label: NAV.pipeline, icon: Kanban, desc: "Move deals forward", color: "bg-primary-soft text-primary" },
  { href: "/dashboard/contacts", label: NAV.contacts, icon: Users, desc: "CRM & lead profiles", color: "bg-bento-blue text-blue-700" },
  { href: "/dashboard/campaigns", label: NAV.campaigns, icon: Megaphone, desc: "WhatsApp outbound", color: "bg-amber-50 text-amber-700" },
];

const activityIcons: Record<string, typeof Sparkles> = {
  ai_classification: Sparkles,
  stage_change: TrendingUp,
  task_created: CheckCircle2,
  task_completed: CheckCircle2,
  note_added: Tag,
  automation_run: Zap,
};

function timeAgo(date: string | Date) {
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function activityLabel(item: { type: string; data: Record<string, unknown> }) {
  switch (item.type) {
    case "ai_classification":
      return `AI classified ${item.data.contactName ?? "a lead"} — ${item.data.intent ?? item.data.stage}`;
    case "stage_change":
      return `${item.data.leadName} moved ${item.data.from} → ${item.data.to}${item.data.isAi ? " (AI)" : ""}`;
    case "task_created":
      return `Task created: ${item.data.title}`;
    case "task_completed":
      return `Task done: ${item.data.title}`;
    case "note_added":
      return `${item.data.author ?? "Team"} noted on ${item.data.leadName}`;
    case "automation_run":
      return `${item.data.result}`;
    default:
      return item.type;
  }
}

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

  const { data: agentStatus } = useQuery({
    queryKey: ["agent-status"],
    queryFn: () =>
      apiFetch<{
        classificationsToday: number;
        automationsToday: number;
        lastClassifiedAt: string | null;
        lastLatencyMs: number | null;
        lastSummary: string | null;
        tasks: { open: number; inProgress: number; done: number };
      }>("/leads/agent-status", { token: token ?? undefined }),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const { data: activityFeed } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: () =>
      apiFetch<Array<{ type: string; time: string; data: Record<string, unknown> }>>(
        "/leads/activity",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const unread = convStats?.unreadMessages ?? 0;
  const isLoading = funnelLoading || convLoading;

  return (
    <div className="dashboard-page">
      {/* Hero greeting */}
      <div className="dashboard-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{EYEBROW.overview}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{timeGreeting(user?.name)}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Your WhatsApp revenue command center — AI is working behind the scenes.
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

      {/* Quick actions */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link href={action.href} className="dashboard-quick-link group">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="truncate text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Metrics */}
      {isLoading ? (
        <MetricCardsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Conversations"
            value={convStats?.totalConversations ?? 0}
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

      {/* Two-column: AI Agent Status + Activity Feed */}
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* AI Agent Status Panel — left 2 cols */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DashboardPanel
            title="AI Revenue Agent"
            description="What AI did today"
            delay={0.2}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-bento-mint to-white p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{agentStatus?.classificationsToday ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Classifications today</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <span className="text-lg font-bold">{agentStatus?.automationsToday ?? 0}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Automations fired</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-lg font-bold">
                      {agentStatus?.lastLatencyMs ? `${(agentStatus.lastLatencyMs / 1000).toFixed(1)}s` : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Avg response time</p>
                </div>
              </div>

              {agentStatus?.lastSummary && (
                <div className="rounded-xl border border-accent/20 bg-bento-mint/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Latest AI summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{agentStatus.lastSummary}</p>
                </div>
              )}

              {/* Tasks widget */}
              <div className="rounded-xl border border-border bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Team tasks</p>
                  <Link href="/dashboard/tasks" className="text-[11px] font-semibold text-accent hover:underline">
                    View all <ArrowUpRight className="ml-0.5 inline h-3 w-3" />
                  </Link>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-amber-600">{agentStatus?.tasks.open ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Open</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{agentStatus?.tasks.inProgress ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">In progress</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-accent">{agentStatus?.tasks.done ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Done</p>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPanel>
        </motion.div>

        {/* Activity Feed — right 3 cols */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <DashboardPanel
            title="Activity feed"
            description="Everything happening across your workspace"
            delay={0.25}
          >
            {!activityFeed || activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bento-mint">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 font-semibold">No activity yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasWhatsapp
                    ? "Activity will appear as AI classifies conversations and your team takes action."
                    : "Connect WhatsApp to start seeing real-time activity."}
                </p>
                <Button asChild size="sm" className="mt-4 rounded-xl">
                  <Link href={hasWhatsapp ? "/dashboard/inbox" : "/onboarding"}>
                    {hasWhatsapp ? CTA.openConversations : "Connect WhatsApp"}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {activityFeed.slice(0, 15).map((item, i) => {
                  const Icon = activityIcons[item.type] ?? Sparkles;
                  const isAi = item.type === "ai_classification" || item.type === "automation_run";
                  return (
                    <motion.div
                      key={`${item.type}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50 ${
                        isAi ? "bg-bento-mint/20" : ""
                      }`}
                    >
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isAi ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{activityLabel(item)}</p>
                        {typeof item.data.nextAction === "string" && item.type === "ai_classification" && (
                          <p className="mt-0.5 text-xs font-medium text-accent">
                            Next: {item.data.nextAction}
                          </p>
                        )}
                        {typeof item.data.summary === "string" && item.type === "ai_classification" && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {item.data.summary}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(item.time)}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </DashboardPanel>
        </motion.div>
      </div>
    </div>
  );
}
