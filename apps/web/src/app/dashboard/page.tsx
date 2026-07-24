"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Tag,
  TrendingUp,
  Zap,
} from "lucide-react";
import { HomeRecommendationsPanel } from "@/components/dashboard/home-recommendations-panel";
import { HomeCampaignRepliesPanel } from "@/components/dashboard/home-campaign-replies-panel";
import { HomeConnectionHealthBanner } from "@/components/dashboard/home-connection-health-banner";
import { HomeAgencyPortfolioBanner } from "@/components/dashboard/home-agency-portfolio-banner";
import { ReturnToWorkBanner } from "@/components/dashboard/return-to-work-banner";
import { WorkspaceOpsTruthStrip } from "@/components/dashboard/workspace-ops-truth-strip";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { HomeCommandCenter } from "@/components/dashboard/home-command-center";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/ui/query-state";
import { PanelRowsSkeleton } from "@/components/ui/page-loading";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { formatActivityLabel } from "@/lib/activity-labels";
import { CTA } from "@/lib/brand-copy";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { timeGreeting } from "@/lib/greeting";
import { useVisibleRefetchInterval } from "@/hooks/use-visible-refetch-interval";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { canUseCampaignsFeatures, type CampaignsBillingSnapshot } from "@/lib/campaigns-plan-access";
import { useAuthStore } from "@/stores/auth-store";
import { canViewTeamAnalytics } from "@/lib/permissions";

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

export default function DashboardPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const showAnalytics = canViewTeamAnalytics(role);
  const activityPollInterval = useVisibleRefetchInterval(15_000);

  const { data: funnel, isLoading: funnelLoading, isError: funnelError, error: funnelErrorObj, refetch: refetchFunnel } = useQuery({
    queryKey: QUERY_KEYS.funnel("30d"),
    queryFn: () =>
      apiFetch<{ total: number; won: number; conversionRate: number; byStage: { stage: string; count: number }[] }>(
        "/leads/metrics/funnel?period=30d",
        { token: token ?? undefined },
      ),
    enabled: !!token && showAnalytics,
    staleTime: STALE.metrics,
    placeholderData: (prev) => prev,
  });

  const { data: convStats, isLoading: convLoading, isError: convError, error: convErrorObj, refetch: refetchConv } = useQuery({
    queryKey: QUERY_KEYS.conversationStats(),
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
    staleTime: STALE.live,
    placeholderData: (prev) => prev,
  });

  const {
    data: activityFeed,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: QUERY_KEYS.activityFeed,
    queryFn: () =>
      apiFetch<Array<{ type: string; time: string; data: Record<string, unknown> }>>(
        "/leads/activity",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: STALE.live,
    refetchInterval: activityPollInterval,
    placeholderData: (prev) => prev,
  });

  const { data: slaSnapshot } = useQuery({
    queryKey: QUERY_KEYS.sla("30d"),
    queryFn: () =>
      apiFetch<{
        medianLabel: string | null;
        breachCount: number;
        unansweredOver24h: number;
        targetHours: number;
      }>("/conversations/metrics/sla?period=30d", { token: token ?? undefined }),
    enabled: !!token && showAnalytics,
    staleTime: STALE.metrics,
    placeholderData: (prev) => prev,
  });

  const { data: revenueSnapshot } = useQuery({
    queryKey: QUERY_KEYS.revenue("30d"),
    queryFn: () =>
      apiFetch<{
        pipelineValueCents: number;
        wonValueCents: number;
        avgDaysToClose: number | null;
      }>("/leads/metrics/revenue?period=30d", {
        token: token ?? undefined,
      }),
    enabled: !!token && showAnalytics,
    staleTime: STALE.metrics,
    placeholderData: (prev) => prev,
  });

  const { data: teamWorkload } = useQuery({
    queryKey: QUERY_KEYS.teamWorkload,
    queryFn: () =>
      apiFetch<{
        unassignedConversations: number;
        members: Array<{ name: string | null; email: string }>;
      }>("/organizations/team-workload", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.dashboard,
    placeholderData: (prev) => prev,
  });

  const { data: billing } = useShellBilling<CampaignsBillingSnapshot>();

  const campaignsPlanOk = canUseCampaignsFeatures(billing);

  const isLoading = (showAnalytics && funnelLoading) || convLoading;
  const dashboardError = showAnalytics ? funnelErrorObj ?? convErrorObj : convErrorObj;
  const trialOrPlanBlocked =
    dashboardError instanceof ApiError && (dashboardError.status === 402 || dashboardError.status === 403);

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <PageHeader
          className="mb-0"
          title={timeGreeting(user?.name)}
          description="Priorities, pipeline ₹, and team activity — one view."
          action={
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link href="/dashboard/inbox">
                {CTA.openConversations}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
      </div>

      {(funnelError || convError) && !isLoading && (
        <div className="mb-8">
          {trialOrPlanBlocked ? (
            <QueryErrorState
              title="Upgrade to keep viewing your dashboard"
              message={toUserMessage(dashboardError, "Your plan needs an upgrade to continue.")}
              onRetry={undefined}
            >
              <Button asChild size="sm" className="mt-4 rounded-xl">
                <Link href="/dashboard/pricing">View plans</Link>
              </Button>
            </QueryErrorState>
          ) : (
            <QueryErrorState
              message={toUserMessage(
                dashboardError,
                "Check your connection and try again.",
              )}
              onRetry={() => {
                if (funnelError) void refetchFunnel();
                if (convError) void refetchConv();
              }}
            />
          )}
        </div>
      )}

      <HomeAgencyPortfolioBanner />
      <WorkspaceOpsTruthStrip />
      <ReturnToWorkBanner />
      <HomeConnectionHealthBanner />

      <HomeCommandCenter
        isLoading={isLoading}
        convStats={convStats}
        funnel={funnel}
        revenueSnapshot={revenueSnapshot}
        slaSnapshot={slaSnapshot}
        teamWorkload={teamWorkload}
      />

      <div className="mt-8">
        <HomeCampaignRepliesPanel enabled={!!campaignsPlanOk} />
      </div>

      <div className="mt-8">
        <HomeRecommendationsPanel />
      </div>

      <div className="mt-8">
        <DashboardPanel
          title="Activity"
          description="Classifications, pipeline moves, and team actions"
          delay={0.15}
        >
          {activityLoading ? (
            <PanelRowsSkeleton rows={5} />
          ) : activityError ? (
            <QueryErrorState
              title="Could not load activity"
              onRetry={() => void refetchActivity()}
            />
          ) : !activityFeed || activityFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bento-mint">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <p className="mt-3 font-semibold">No activity yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Activity appears as AI classifies conversations and your team takes action.
              </p>
              <Button asChild size="sm" className="mt-4 rounded-xl">
                <Link href="/dashboard/inbox">{CTA.openConversations}</Link>
              </Button>
            </div>
          ) : (
            <div className="max-h-[460px] space-y-1 overflow-y-auto custom-scrollbar pr-1">
              {activityFeed.slice(0, 15).map((item, i) => {
                const Icon = activityIcons[item.type] ?? Sparkles;
                const isAi = item.type === "ai_classification" || item.type === "automation_run";
                const { primary, secondary, href } = formatActivityLabel(item);
                const inner = (
                  <>
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isAi ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{primary}</p>
                      {secondary && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{secondary}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.time)}</span>
                  </>
                );
                return (
                  <div key={`${item.type}-${item.time}-${i}`}
                    className={`flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50 ${
                      isAi ? "bg-bento-mint/20" : ""
                    }`}>
                    {href ? (
                      <Link href={href} className="flex w-full items-start gap-3">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
