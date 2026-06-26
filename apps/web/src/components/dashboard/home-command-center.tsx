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
import { formatInr } from "@/lib/crm";
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
  revenueSnapshot?: { pipelineValueCents: number };
  slaSnapshot?: {
    medianLabel: string | null;
    unansweredOver24h: number;
    targetHours: number;
  };
  agentStatus?: {
    classificationsToday: number;
    automationsToday: number;
  };
  teamWorkload?: {
    unassignedConversations: number;
    members: Array<{ name: string | null; email: string }>;
  };
  hasWhatsapp: boolean;
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
  agentStatus,
  teamWorkload,
  hasWhatsapp,
}: HomeCommandCenterProps) {
  if (isLoading) return <MetricCardsSkeleton variant="home" />;

  const unread = convStats?.unreadMessages ?? 0;
  const handoffs = convStats?.humanHandoffRecommended ?? 0;
  const stale = slaSnapshot?.unansweredOver24h ?? 0;
  const unassigned = teamWorkload?.unassignedConversations ?? 0;
  const openLeads = openLeadCount(funnel);
  const pipelineValue = formatInr(revenueSnapshot?.pipelineValueCents);
  const openStages = (funnel?.byStage ?? []).filter(
    (s) => s.stage !== "WON" && s.stage !== "LOST" && s.count > 0,
  );
  const stageTotal = openStages.reduce((n, s) => n + s.count, 0) || 1;

  const priorityCount = [unread, handoffs, stale, unassigned].filter((n) => n > 0).length;

  return (
    <div className="space-y-6">
      {/* ── Today's priorities ── */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Today&apos;s priorities
            </p>
            <h2 className="text-base font-bold text-foreground">
              {priorityCount > 0
                ? `${priorityCount} item${priorityCount === 1 ? "" : "s"} need attention`
                : "You're caught up — nice work"}
            </h2>
          </div>
          {priorityCount > 0 && (
            <Button asChild size="sm" variant="outline" className="hidden shrink-0 rounded-xl sm:inline-flex">
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
            href="/dashboard/inbox"
            actionLabel={unread > 0 ? "Reply now" : "View inbox"}
            urgent={unread > 0}
            delay={0}
          />
          <MetricCard
            title="Needs your team"
            value={handoffs}
            delta={
              handoffs > 0
                ? "AI flagged for human follow-up"
                : hasWhatsapp
                  ? "No handoffs right now"
                  : "Connect WhatsApp to enable"
            }
            icon={<UserRound className="h-5 w-5" />}
            variant={handoffs > 0 ? "rose" : "slate"}
            href={handoffs > 0 ? "/dashboard/inbox?filter=handoff" : "/dashboard/inbox"}
            actionLabel={handoffs > 0 ? "Review handoffs" : "Open inbox"}
            urgent={handoffs > 0}
            delay={0.04}
          />
          <MetricCard
            title="Waiting 24h+"
            value={stale}
            delta={
              stale > 0
                ? "No Growvisi human reply yet"
                : `Target ${slaSnapshot?.targetHours ?? 4}h reply time`
            }
            icon={<Clock className="h-5 w-5" />}
            variant={stale > 0 ? "rose" : "blue"}
            href="/dashboard/inbox"
            actionLabel={stale > 0 ? "Respond today" : "View conversations"}
            urgent={stale > 0}
            delay={0.08}
          />
          <MetricCard
            title="Unassigned"
            value={unassigned}
            delta={
              unassigned > 0
                ? "Threads without an owner"
                : "All conversations assigned"
            }
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={unassigned > 0 ? "amber" : "slate"}
            href="/dashboard/inbox"
            actionLabel={unassigned > 0 ? "Assign owners" : "Team settings"}
            urgent={unassigned > 0}
            delay={0.12}
          />
        </div>
      </section>

      {/* ── Revenue pulse ── */}
      <section>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Revenue pulse
        </p>
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MetricCard
              title="Open pipeline value"
              value={pipelineValue}
              delta={`${openLeads} open lead${openLeads === 1 ? "" : "s"}${funnel?.won ? ` · ${funnel.won} won` : ""}`}
              icon={<IndianRupee className="h-6 w-6" />}
              variant="emerald"
              size="large"
              href="/dashboard/pipeline"
              actionLabel="Open pipeline board"
              delay={0.14}
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-2">
            <MetricCard
              title="Open leads"
              value={openLeads}
              delta={`${funnel?.total ?? 0} total in CRM`}
              trend={funnel?.won ? "up" : "neutral"}
              icon={<Users className="h-5 w-5" />}
              variant="blue"
              href="/dashboard/contacts"
              actionLabel="View contacts"
              delay={0.16}
            />
            <MetricCard
              title="AI classifications"
              value={convStats?.aiClassifications ?? 0}
              delta={`${agentStatus?.classificationsToday ?? 0} today · ${convStats?.classifiedLeads ?? 0} leads scored`}
              icon={<Sparkles className="h-5 w-5" />}
              variant="violet"
              href="/dashboard/ai"
              actionLabel="How Intelligence works"
              delay={0.18}
            />
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
                  {s.stage[0] + s.stage.slice(1).toLowerCase()} ({s.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Workspace stats ── */}
      <section>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Conversations"
            value={convStats?.totalConversations ?? 0}
            delta={`${convStats?.inboundMessages ?? 0} customer messages`}
            icon={<Inbox className="h-4 w-4" />}
            variant="blue"
            href="/dashboard/inbox"
            delay={0.2}
            muted
          />
          <MetricCard
            title="Median reply"
            value={slaSnapshot?.medianLabel ?? "—"}
            delta={`Target ${slaSnapshot?.targetHours ?? 4}h · Growvisi human replies`}
            icon={<Clock className="h-4 w-4" />}
            variant="slate"
            href="/dashboard/analytics"
            delay={0.22}
            muted
          />
          <MetricCard
            title="Automations today"
            value={agentStatus?.automationsToday ?? 0}
            delta="Emails & tasks fired"
            icon={<TrendingUp className="h-4 w-4" />}
            variant="mint"
            href="/dashboard/automations"
            delay={0.24}
            muted
          />
          <MetricCard
            title="Won revenue"
            value={funnel?.won ?? 0}
            delta={
              funnel?.conversionRate != null
                ? `${Math.round(funnel.conversionRate * 100)}% win rate`
                : "Closed deals"
            }
            trend={funnel?.won ? "up" : "neutral"}
            icon={<IndianRupee className="h-4 w-4" />}
            variant="mint"
            href="/dashboard/pipeline"
            delay={0.26}
            muted
          />
        </div>
      </section>
    </div>
  );
}
