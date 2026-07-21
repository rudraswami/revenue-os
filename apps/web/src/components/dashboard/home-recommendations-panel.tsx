"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  Bot,
  Lightbulb,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { InsightActionButtons, type InsightAction } from "@/components/dashboard/insight-action-buttons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { PanelRowsSkeleton } from "@/components/ui/page-loading";
import { apiFetch } from "@/lib/api-client";
import { canWrite, canViewTeamAnalytics } from "@/lib/permissions";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const iconMap = {
  Urgent: UserRound,
  "Action needed": AlertCircle,
  Pipeline: TrendingUp,
  Tip: Lightbulb,
  "Getting started": Lightbulb,
} as const;

const sentimentColors: Record<string, string> = {
  positive: "text-accent bg-bento-mint",
  neutral: "text-info bg-info/10",
  negative: "text-destructive bg-destructive/10",
};

function toneFor(type: string) {
  switch (type) {
    case "Urgent":
      return { tone: "border-warning/30 bg-warning/10", iconBg: "bg-warning/15 text-warning" };
    case "Action needed":
      return { tone: "border-destructive/30 bg-destructive/10", iconBg: "bg-destructive/15 text-destructive" };
    case "Pipeline":
      return { tone: "border-border bg-background", iconBg: "bg-bento-mint text-accent" };
    default:
      return { tone: "border-border bg-card", iconBg: "bg-muted text-muted-foreground" };
  }
}

export function HomeRecommendationsPanel() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canEdit = canWrite(role);
  const showInsights = canViewTeamAnalytics(role);
  const qc = useQueryClient();
  const period = "30d";

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.insights(period),
    queryFn: () =>
      apiFetch<{
        items: Array<{
          id: string;
          type: string;
          title: string;
          body: string;
          href: string;
          actionLabel: string;
          actions: InsightAction[];
        }>;
        actionLeads: Array<{
          id: string;
          conversationId: string | null;
          name: string;
          score: number;
          stage: string;
          nextAction: string | null;
          summary: string | null;
          intent: string | null;
          sentiment: string | null;
          tags: string[];
        }>;
      }>(`/leads/metrics/insights?period=${period}`, { token: token ?? undefined }),
    enabled: !!token && showInsights,
    staleTime: STALE.dashboard,
    placeholderData: (prev) => prev,
  });

  const createLeadTask = useMutation({
    mutationFn: (leadId: string) =>
      apiFetch(`/leads/metrics/insights/actions/lead-task/${leadId}`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const insights = data?.items ?? [];
  const actionLeads = data?.actionLeads ?? [];

  if (isLoading && !data) {
    return (
      <section id="recommendations" className="mb-8 scroll-mt-6">
        <PanelRowsSkeleton rows={3} />
      </section>
    );
  }

  if (isError) {
    return (
      <section id="recommendations" className="mb-8 scroll-mt-6">
        <QueryErrorState onRetry={() => void refetch()} />
      </section>
    );
  }

  if (insights.length === 0 && actionLeads.length === 0) {
    return null;
  }

  return (
    <section id="recommendations" className="mb-8 scroll-mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-accent">Recommendations</p>
          <h2 className="text-lg font-bold">What to do next</h2>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {insights.length === 0 ? (
            <DashboardPanel>
              <EmptyState
                icon={<Lightbulb className="h-6 w-6" />}
                title="You're on track"
                description="No urgent recommendations. Keep conversations flowing."
                actionHref="/dashboard/inbox"
                actionLabel="Open conversations"
              />
            </DashboardPanel>
          ) : (
            insights.map((item) => {
              const Icon = iconMap[item.type as keyof typeof iconMap] ?? Lightbulb;
              const { tone, iconBg } = toneFor(item.type);
              return (
                <DashboardPanel key={item.id} noPadding className={tone} delay={0}>
                  <div className="flex flex-row items-start gap-4 p-5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {item.type}
                      </p>
                      <h3 className="mt-1 text-base font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                      <InsightActionButtons insightId={item.id} actions={item.actions} />
                    </div>
                  </div>
                </DashboardPanel>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          <DashboardPanel
            title="Hot leads"
            description="Score 70+ — needs your team's attention"
            delay={0}
          >
            {actionLeads.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Bot className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p>No high-priority leads right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={
                      lead.conversationId
                        ? `/dashboard/inbox?c=${lead.conversationId}`
                        : `/dashboard/contacts`
                    }
                    className="block rounded-xl border border-border p-3.5 transition-all hover:border-accent/25 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold">{lead.name}</p>
                          <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-xs font-bold text-accent">
                            {lead.score}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                          {lead.stage.toLowerCase().replace("_", " ")}
                          {lead.intent && ` · ${lead.intent}`}
                        </p>
                      </div>
                      {lead.sentiment && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-xs font-bold capitalize",
                            sentimentColors[lead.sentiment] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {lead.sentiment}
                        </span>
                      )}
                    </div>
                    {lead.nextAction && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-bento-mint/40 p-2">
                        <Target className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                        <p className="text-xs font-medium text-accent">{lead.nextAction}</p>
                      </div>
                    )}
                    {canEdit && lead.nextAction && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 w-full text-xs"
                        disabled={createLeadTask.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          createLeadTask.mutate(lead.id);
                        }}
                      >
                        Create task
                      </Button>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>
      </div>
    </section>
  );
}
