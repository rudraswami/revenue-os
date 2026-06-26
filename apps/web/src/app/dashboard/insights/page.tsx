"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { InsightActionButtons, type InsightAction } from "@/components/dashboard/insight-action-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { canWrite } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import { METRICS_PERIOD_OPTIONS, type MetricsPeriod } from "@/lib/metrics-period";
import { useState } from "react";
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
  neutral: "text-blue-600 bg-blue-50",
  negative: "text-red-600 bg-red-50",
};

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
  const role = useAuthStore((s) => s.role);
  const canEdit = canWrite(role);
  const qc = useQueryClient();
  const [period, setPeriod] = useState<MetricsPeriod>("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["insights", period],
    queryFn: () =>
      apiFetch<{
        period: MetricsPeriod;
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
    enabled: !!token,
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

  const toneFor = (type: string) => {
    switch (type) {
      case "Urgent":
        return { tone: "border-amber-200 bg-amber-50/50", iconBg: "bg-amber-100 text-amber-700" };
      case "Action needed":
        return { tone: "border-red-200/80 bg-red-50/40", iconBg: "bg-red-100 text-red-600" };
      case "Pipeline":
        return { tone: "border-[#dce9ff] bg-[#f8f9ff]", iconBg: "bg-[#ecfdf5] text-accent" };
      default:
        return { tone: "border-[#dce9ff] bg-white", iconBg: "bg-muted text-muted-foreground" };
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Recommendations"
        title="Insights"
        description="AI-powered recommendations and next-best-actions from your revenue pipeline."
        badge={
          insights.length > 0 && !isLoading ? (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
              {insights.length} active
            </span>
          ) : undefined
        }
        action={
          <div className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-white p-1">
            {METRICS_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  period === opt.value
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {isError && !isLoading && <QueryErrorState onRetry={() => void refetch()} />}

      {isLoading && <InsightCardSkeleton />}

      {!isLoading && !isError && (
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Insights */}
          <div className="lg:col-span-3 space-y-4">
            {insights.length === 0 && (
              <DashboardPanel>
                <EmptyState
                  icon={<Lightbulb className="h-6 w-6" />}
                  title="You're on track"
                  description="No urgent insights right now. Keep selling and check back after more conversations."
                  actionHref="/dashboard/inbox"
                  actionLabel="Open conversations"
                />
              </DashboardPanel>
            )}

            {insights.map((item, i) => {
              const Icon = iconMap[item.type as keyof typeof iconMap] ?? Lightbulb;
              const { tone, iconBg } = toneFor(item.type);
              return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <DashboardPanel noPadding className={tone}>
                  <div className="flex flex-row items-start gap-4 p-5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.type}</p>
                      <h3 className="mt-1 text-base font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                      <InsightActionButtons
                        insightId={item.id}
                        actions={item.actions}
                      />
                    </div>
                  </div>
                </DashboardPanel>
              </motion.div>
              );
            })}
          </div>

          {/* Right: AI Action leads */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <DashboardPanel
                title="AI next-best-action"
                description="Top leads that need your attention"
                delay={0.2}
              >
                {actionLeads.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Bot className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p>No high-priority leads right now.</p>
                    <p className="mt-1 text-xs">Leads with score 70+ will appear here with AI-generated action items.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionLeads.map((lead, i) => (
                      <motion.div
                        key={lead.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.06 }}
                      >
                        <Link
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
                                <p className="text-sm font-bold truncate">{lead.name}</p>
                                <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                                  {lead.score}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">
                                {lead.stage.toLowerCase().replace("_", " ")}
                                {lead.intent && ` · ${lead.intent}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {lead.sentiment && (
                                <span className={cn(
                                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize",
                                  sentimentColors[lead.sentiment] ?? "text-muted-foreground bg-muted",
                                )}>
                                  {lead.sentiment}
                                </span>
                              )}
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>

                          {lead.nextAction && (
                            <div className="mt-2 flex items-start gap-2 rounded-lg bg-bento-mint/40 p-2">
                              <Target className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                              <p className="text-xs font-medium text-accent">{lead.nextAction}</p>
                            </div>
                          )}

                          {lead.summary && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{lead.summary}</p>
                          )}

                          {lead.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {lead.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {canEdit && lead.nextAction && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7 w-full text-[10px]"
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
                      </motion.div>
                    ))}
                  </div>
                )}
              </DashboardPanel>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4"
            >
              <DashboardPanel noPadding className="border-accent/20 bg-gradient-to-r from-bento-mint/30 to-white">
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-sm font-bold">Powered by AI</p>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Summaries, tags, and next-actions are generated automatically when AI classifies
                    your WhatsApp conversations. Keep conversations flowing for richer insights.
                  </p>
                  <Button asChild size="sm" variant="link" className="mt-2 h-auto p-0 text-accent">
                    <Link href="/dashboard/ai" className="inline-flex items-center gap-1">
                      How Intelligence works
                      <Zap className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </DashboardPanel>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
