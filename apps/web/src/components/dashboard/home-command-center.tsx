"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Inbox,
  IndianRupee,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricCardsSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatInr, STAGE_LABELS } from "@/lib/crm";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

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
  const copy = useConversationsCopy();
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
  const wonCount = funnel?.won ?? 0;
  const lostCount = Math.max(0, (funnel?.total ?? 0) - openLeads - wonCount);

  return (
    <div className="space-y-8">
      {/* Operational — what needs a human today */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">Today&apos;s priorities</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {priorityCount > 0
                ? `${priorityCount} area${priorityCount === 1 ? "" : "s"} need attention`
                : "Inbox is clear — focus on closing pipeline"}
            </p>
          </div>
          {priorityCount > 0 && (
            <Button asChild size="sm" variant="outline" className="hidden shrink-0 rounded-lg sm:inline-flex">
              <Link href="/dashboard/inbox">Open inbox</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Unread messages"
            value={unread}
            delta={unread > 0 ? "Customers waiting in WhatsApp" : "Inbox is clear"}
            icon={<Inbox className="h-5 w-5" />}
            variant={unread > 0 ? "amber" : "slate"}
            href={unread > 0 ? "/dashboard/inbox?filter=unread" : "/dashboard/inbox"}
            actionLabel={unread > 0 ? "Reply now" : "View inbox"}
            urgent={unread > 0}
          />
          <MetricCard
            title={copy.yourTurn}
            value={handoffs}
            delta={handoffs > 0 ? copy.yourTurnHint : copy.yourTurnClear}
            icon={<UserRound className="h-5 w-5" />}
            variant={handoffs > 0 ? "rose" : "slate"}
            href={handoffs > 0 ? "/dashboard/inbox?filter=handoff" : "/dashboard/inbox"}
            actionLabel={handoffs > 0 ? copy.seeWhoWaiting : copy.openConversations}
            urgent={handoffs > 0}
          />
          <MetricCard
            title="Waiting 24h+"
            value={stale}
            delta={
              stale > 0
                ? "No human reply yet"
                : `Target ${slaSnapshot?.targetHours ?? 4}h first response`
            }
            icon={<Clock className="h-5 w-5" />}
            variant={stale > 0 ? "rose" : "blue"}
            href="/dashboard/inbox"
            actionLabel={stale > 0 ? "Respond today" : "View conversations"}
            urgent={stale > 0}
          />
          <MetricCard
            title="Unassigned"
            value={unassigned}
            delta={unassigned > 0 ? "Threads without an owner" : "All conversations assigned"}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={unassigned > 0 ? "amber" : "slate"}
            href={unassigned > 0 ? "/dashboard/inbox?filter=unassigned" : "/dashboard/inbox"}
            actionLabel={unassigned > 0 ? "Assign owners" : "Team settings"}
            urgent={unassigned > 0}
          />
        </div>
      </section>

      {/* Outcome — revenue from WhatsApp */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-bold text-foreground">Revenue pulse</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Last 30 days · pipeline and closed ₹</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <MetricCard
              title="Open pipeline value"
              value={pipelineValue}
              delta={
                (revenueSnapshot?.pipelineValueCents ?? 0) > 0
                  ? `${openLeads} open lead${openLeads === 1 ? "" : "s"} with ₹`
                  : openLeads > 0
                    ? `${openLeads} open — add ₹ on pipeline cards`
                    : "No open deals with ₹ value"
              }
              icon={<IndianRupee className="h-6 w-6" />}
              variant="emerald"
              size="large"
              href="/dashboard/pipeline"
              actionLabel="Open pipeline board"
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                title="Won revenue (30d)"
                value={wonRevenue}
                delta={
                  wonCount > 0
                    ? `${wonCount} deal${wonCount === 1 ? "" : "s"} closed`
                    : "Close a deal to see won ₹"
                }
                trend={revenueSnapshot?.wonValueCents ? "up" : "neutral"}
                icon={<TrendingUp className="h-5 w-5" />}
                variant="mint"
                href="/dashboard/pipeline"
                actionLabel="View won deals"
              />
              <MetricCard
                title="Avg days to close"
                value={avgDays}
                delta={
                  revenueSnapshot?.avgDaysToClose != null
                    ? "Based on won deals (30d)"
                    : "Close a deal to see velocity"
                }
                icon={<Clock className="h-5 w-5" />}
                variant="blue"
                href="/dashboard/analytics"
                actionLabel="View analytics"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                title="Open leads"
                value={openLeads}
                delta={`${funnel?.total ?? 0} total in CRM`}
                icon={<Users className="h-5 w-5" />}
                variant="blue"
                href="/dashboard/contacts"
                actionLabel="View contacts"
              />
              <MetricCard
                title="Win rate"
                value={
                  funnel?.conversionRate != null
                    ? `${Math.round(funnel.conversionRate * 100)}%`
                    : "—"
                }
                delta={`${wonCount} won · ${lostCount} lost (30d)`}
                icon={<Sparkles className="h-5 w-5" />}
                variant="violet"
                href="/dashboard/analytics"
                actionLabel="Revenue analytics"
              />
            </div>
          </div>
        </div>

        {openStages.length > 0 && (
          <div className="mt-3 rounded-xl border border-border bg-white px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Leads by stage</span>
              <Link href="/dashboard/pipeline" className="font-semibold text-accent hover:underline">
                Pipeline →
              </Link>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              {openStages.map((s) => (
                <div
                  key={s.stage}
                  className={cn("h-full", STAGE_COLORS[s.stage] ?? "bg-slate-400")}
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
