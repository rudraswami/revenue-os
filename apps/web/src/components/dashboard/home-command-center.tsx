"use client";

import Link from "next/link";
import {
  IndianRupee,
  Sparkles,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricCardsSkeleton } from "@/components/ui/skeleton";
import { formatInr, STAGE_LABELS } from "@/lib/crm";
import { cn } from "@/lib/utils";
import { HomeUrgentStrip, type UrgentCounts } from "./home-urgent-strip";

interface FunnelData {
  total: number;
  won: number;
  conversionRate: number;
  byStage: { stage: string; count: number }[];
}

interface HomeCommandCenterProps {
  isLoading: boolean;
  convStats?: {
    totalConversations: number;
    unreadMessages: number;
    inboundMessages: number;
    aiClassifications: number;
    classifiedLeads: number;
    humanHandoffRecommended: number;
  };
  funnel?: FunnelData;
  revenueSnapshot?: {
    pipelineValueCents: number;
    wonValueCents: number;
    avgDaysToClose: number | null;
  };
  slaSnapshot?: {
    medianLabel: string | null;
    unansweredOver24h: number;
    targetHours: number;
  };
  teamWorkload?: {
    unassignedConversations: number;
    members: Array<{ name: string | null; email: string }>;
  };
}

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-sky-500",
  QUALIFIED: "bg-indigo-500",
  PROPOSAL: "bg-violet-500",
  NEGOTIATION: "bg-amber-500",
  WON: "bg-emerald-500",
  LOST: "bg-rose-400",
};

function openLeadCount(funnel?: FunnelData) {
  if (!funnel?.byStage?.length) return funnel?.total ?? 0;
  return funnel.byStage
    .filter((s) => s.stage !== "WON" && s.stage !== "LOST")
    .reduce((n, s) => n + s.count, 0);
}

export function HomeCommandCenter({
  isLoading,
  convStats,
  funnel,
  revenueSnapshot,
  slaSnapshot,
  teamWorkload,
}: HomeCommandCenterProps) {
  if (isLoading) return <MetricCardsSkeleton variant="home" />;

  const unread = convStats?.unreadMessages ?? 0;
  const handoffs = convStats?.humanHandoffRecommended ?? 0;
  const stale = slaSnapshot?.unansweredOver24h ?? 0;
  const unassigned = teamWorkload?.unassignedConversations ?? 0;
  const openLeads = openLeadCount(funnel);
  const pipelineValue = formatInr(revenueSnapshot?.pipelineValueCents);
  const wonRevenue = formatInr(revenueSnapshot?.wonValueCents);
  const avgDays =
    revenueSnapshot?.avgDaysToClose != null
      ? `${revenueSnapshot.avgDaysToClose}d`
      : "—";
  const openStages = (funnel?.byStage ?? []).filter(
    (s) => s.stage !== "WON" && s.stage !== "LOST" && s.count > 0,
  );
  const stageTotal = openStages.reduce((n, s) => n + s.count, 0) || 1;

  const priorityCount = [unread, handoffs, stale, unassigned].filter((n) => n > 0).length;
  const urgentCounts: UrgentCounts = { unread, handoffs, stale, unassigned };
  const qualifiedCount = funnel?.total ?? 0;
  const wonCount = funnel?.won ?? 0;

  return (
    <div className="space-y-6">
      <HomeUrgentStrip counts={urgentCounts} />

      {priorityCount === 0 && (
        <p className="text-sm text-muted-foreground">Inbox is clear — focus on pipeline and follow-ups.</p>
      )}

      {/* ── Revenue pulse ── */}
      <section>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Revenue pulse
        </p>
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <MetricCard
              title="Open pipeline value"
              value={pipelineValue}
              delta={
                (revenueSnapshot?.pipelineValueCents ?? 0) > 0
                  ? `${openLeads} open lead${openLeads === 1 ? "" : "s"} with ₹ value`
                  : openLeads > 0
                    ? `${openLeads} open — add ₹ on pipeline cards`
                    : "No open deals with ₹ value"
              }
              icon={<IndianRupee className="h-6 w-6" />}
              variant="emerald"
              size="large"
              href="/dashboard/pipeline"
              actionLabel="Open pipeline board"
              delay={0.14}
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                title="Won revenue (30d)"
                value={wonRevenue}
                delta={
                  wonCount > 0
                    ? `${wonCount} deal${wonCount === 1 ? "" : "s"} · last 30 days`
                    : "No deals closed this period"
                }
                trend={revenueSnapshot?.wonValueCents ? "up" : "neutral"}
                icon={<TrendingUp className="h-5 w-5" />}
                variant="mint"
                href="/dashboard/pipeline"
                actionLabel="View won deals"
                delay={0.15}
              />
              <MetricCard
                title="Avg days to close"
                value={avgDays}
                delta={
                  revenueSnapshot?.avgDaysToClose != null
                    ? "Won deals in last 30 days"
                    : "Close a deal to see velocity"
                }
                icon={<Clock className="h-5 w-5" />}
                variant="blue"
                href="/dashboard/analytics"
                actionLabel="View analytics"
                delay={0.16}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                title="Open leads"
                value={openLeads}
                delta={`${funnel?.total ?? 0} total in CRM`}
                trend={funnel?.won ? "up" : "neutral"}
                icon={<Users className="h-5 w-5" />}
                variant="blue"
                href="/dashboard/contacts"
                actionLabel="View contacts"
                delay={0.17}
              />
              <MetricCard
                title="Win rate"
                value={
                  funnel?.conversionRate != null
                    ? `${Math.round(funnel.conversionRate * 100)}%`
                    : "—"
                }
                delta={`${wonCount} won · ${qualifiedCount} in funnel (30d)`}
                icon={<Sparkles className="h-5 w-5" />}
                variant="violet"
                href="/dashboard/analytics"
                actionLabel="Revenue analytics"
                delay={0.18}
              />
            </div>
          </div>
        </div>

        {openStages.length > 0 && (
          <div className="mt-3 rounded-2xl border border-[#dce9ff] bg-white/80 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Leads by stage</span>
              <Link href="/dashboard/pipeline" className="font-semibold text-accent hover:underline">
                Pipeline →
              </Link>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              {openStages.map((s) => (
                <div
                  key={s.stage}
                  className={cn("h-full transition-all", STAGE_COLORS[s.stage] ?? "bg-slate-400")}
                  style={{ width: `${(s.count / stageTotal) * 100}%` }}
                  title={`${s.stage}: ${s.count}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {openStages.map((s) => (
                <span key={s.stage} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span
                    className={cn("h-2 w-2 rounded-full", STAGE_COLORS[s.stage] ?? "bg-slate-400")}
                  />
                  {STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS] ??
                    s.stage[0] + s.stage.slice(1).toLowerCase()}{" "}
                  ({s.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
