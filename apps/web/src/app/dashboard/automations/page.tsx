"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { DailyDigestCard } from "@/components/dashboard/daily-digest-card";
import { WhatsAppAutoReplySetup } from "@/components/dashboard/whatsapp-auto-reply-setup";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
} from "@/lib/automation-preferences";
import { apiFetch } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { GrowvisiPlanId } from "@growvisi/shared";
import { Activity, Bell, Clock, MessageCircle, Sparkles, Timer, UserRound, Zap } from "lucide-react";
import { QueryErrorState } from "@/components/ui/query-state";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/locale-provider";
import { CONVERSATIONS } from "@/lib/brand-copy";

const SERVER_AUTOMATIONS: Array<{
  id: Exclude<AutomationId, "welcome">;
  icon: typeof MessageCircle;
  title: string;
  description: string;
  impact: string;
  serverNote: string;
}> = [
  {
    id: "followup",
    icon: Clock,
    title: "Follow-up reminder",
    description: "Email your team when a conversation has waited 24+ hours without a reply.",
    impact: "Fewer dropped leads",
    serverNote: "Daily email when enabled",
  },
  {
    id: "stage",
    icon: Zap,
    title: "Auto stage update",
    description: "Let AI move leads forward when classification confidence is high.",
    impact: "Cleaner pipeline",
    serverNote: "Runs on each classification",
  },
  {
    id: "notify",
    icon: Bell,
    title: "Hot lead alert",
    description: "Email owners when a lead score hits 70 or higher.",
    impact: "Close faster",
    serverNote: "Email alert when enabled",
  },
  {
    id: "handoff",
    icon: UserRound,
    title: `${CONVERSATIONS.yourTurn} task`,
    description:
      `When AI flags a chat as ${CONVERSATIONS.waitingOnYou.toLowerCase()}, create a high-priority task and email the assignee.`,
    impact: "No hot leads left hanging",
    serverNote: "Task + email on requiresHuman",
  },
  {
    id: "staleDeal",
    icon: Timer,
    title: "Stale deal reminder",
    description:
      "Daily task + email when a deal sits 3+ days in the same stage or waits 48h for a reply. Growth plan.",
    impact: "Recover stuck ₹",
    serverNote: "Daily cron when enabled",
  },
  {
    id: "stageNotify",
    icon: Bell,
    title: "Stage change alert",
    description: "Email owners when a teammate manually moves a lead to a new pipeline stage.",
    impact: "Team visibility",
    serverNote: "Email on manual stage move",
  },
];

function timeAgo(date: string | Date) {
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

export default function AutomationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();

  const { data: toggles, isLoading, isError: prefsError, refetch: refetchPrefs } = useQuery({
    queryKey: ["automation-preferences"],
    queryFn: () => apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    initialData: DEFAULT_AUTOMATIONS,
  });

  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiFetch<{ planId: GrowvisiPlanId }>("/billing", { token: token ?? undefined }),
    enabled: !!token,
  });

  const growthPlanOk = PLAN_RANK[billing?.planId ?? "trial"] >= PLAN_RANK.growth;

  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    queryFn: () => apiFetch<{
      totalRuns30d: number;
      byType: Array<{ type: string; count: number }>;
    }>("/automations/stats", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: logs } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: () => apiFetch<Array<{
      id: string;
      automationType: string;
      trigger: string;
      result: string;
      createdAt: string;
    }>>("/automations/logs", { token: token ?? undefined }),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<Record<AutomationId, boolean>>) =>
      apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["automation-preferences"], data);
      success(t("toast.automationsSaved"));
    },
    onError: (e) => {
      toastError(
        e instanceof Error && e.message.includes("Growth")
          ? "Stale deal reminder requires the Growth plan."
          : t("toast.actionFailed"),
      );
    },
  });

  function toggle(id: AutomationId, enabled: boolean) {
    mutation.mutate({ [id]: enabled });
  }

  const activeCount = Object.entries(toggles ?? DEFAULT_AUTOMATIONS)
    .filter(([id, on]) => id !== "welcome" && on)
    .length;

  const autoTypeIcons: Record<string, typeof Zap> = {
    stage: Zap,
    notify: Bell,
    followup: Clock,
    handoff: Activity,
    staleDeal: Timer,
    stageNotify: Bell,
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Automations"
        description="Set up WhatsApp replies and team workflows — saved per workspace."
        badge={
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
            {activeCount} team workflows on
          </span>
        }
        action={
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard/ai">Business Knowledge</Link>
          </Button>
        }
      />

      {prefsError ? (
        <QueryErrorState
          title="Couldn't load automation settings"
          onRetry={() => void refetchPrefs()}
        />
      ) : null}

      <WhatsAppAutoReplySetup />

      <div className="my-10 border-t border-border/60" />

      <div className="mb-6">
        <h2 className="text-base font-bold text-foreground">Team workflows</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Email alerts and pipeline updates that run in the background — separate from WhatsApp replies.
        </p>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-bento-mint/40 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.totalRuns30d ?? 0}</p>
            <p className="text-xs text-muted-foreground">Runs last 30 days</p>
          </div>
        </div>
        {(stats?.byType ?? []).slice(0, 2).map((bt) => {
          const Icon = autoTypeIcons[bt.type] ?? Zap;
          return (
            <div key={bt.type} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bento-mint text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bt.count}</p>
                <p className="text-xs capitalize text-muted-foreground">{bt.type} runs</p>
              </div>
            </div>
          );
        })}
      </div>

      <DashboardPanel
        noPadding
        className="mb-8"
        delay={0.05}
      >
        <div className="p-5 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="font-semibold">How team workflows run</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage updates and hot-lead alerts fire when AI classifies messages. Follow-up and stale-deal
            reminders run once daily.
          </p>
        </div>
      </DashboardPanel>

      {mutation.isError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t save that change.{" "}
          {mutation.error instanceof Error && mutation.error.message.includes("Growth")
            ? "Stale deal reminder requires the Growth plan."
            : "Please try again."}
        </p>
      )}

      {!canManage && (
        <div className="mb-6 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You have view-only access. Ask an admin or manager to change automations.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {SERVER_AUTOMATIONS.map((a) => (
            <div key={a.id} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <DashboardPanel noPadding className="border-accent/20 bg-bento-mint/30">
            <div className="flex flex-row items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bento-mint text-accent">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">Welcome & first reply</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Meta or human
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  First replies can come from your team in Inbox, WhatsApp directly, or optional Meta
                  Business Agent — Growvisi classifies intent from the full thread. No toggle needed here.
                </p>
                <p className="mt-2 text-xs font-medium text-accent">Always on via WhatsApp</p>
              </div>
            </div>
          </DashboardPanel>

          {SERVER_AUTOMATIONS.map((auto) => {
            const enabled = toggles?.[auto.id] ?? DEFAULT_AUTOMATIONS[auto.id];
            const runCount = stats?.byType.find((b) => b.type === auto.id)?.count ?? 0;
            const planLocked = auto.id === "staleDeal" && !growthPlanOk;
            return (
              <DashboardPanel key={auto.id} noPadding className={enabled ? "border-accent/25 ring-1 ring-accent/10" : ""}>
                <div className="flex flex-row items-start gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      enabled ? "bg-accent text-white" : "bg-bento-mint text-accent"
                    }`}
                  >
                    <auto.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{auto.title}</h3>
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {auto.impact}
                      </span>
                      {runCount > 0 && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                          {runCount} runs
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{auto.description}</p>
                    <p className="mt-2 text-xs font-medium text-accent">
                      {planLocked
                        ? "Requires Growth plan"
                        : enabled
                          ? auto.serverNote
                          : "Off"}
                    </p>
                    {planLocked && (
                      <Link
                        href="/dashboard/pricing?plan=growth"
                        className="mt-1 inline-block text-xs font-semibold text-accent hover:underline">
                        Upgrade to Growth →
                      </Link>
                    )}
                  </div>
                  <Switch
                    checked={enabled && !planLocked}
                    disabled={!canManage || mutation.isPending || planLocked}
                    onCheckedChange={(v) => toggle(auto.id, v)}
                    aria-label={`${auto.title} automation`}
                  />
                </div>
              </DashboardPanel>
            );
          })}
        </div>
      )}

      <div className="mt-10">
        <DailyDigestCard />
      </div>

      {/* Automation execution log */}
      <div className="mt-8">
        <DashboardPanel
          title="Execution history"
          description="Recent automation runs across your workspace"
          delay={0.3}
        >
          {!logs || logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p>No automation runs yet. Enable automations above to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[360px] overflow-y-auto custom-scrollbar">
              {logs.map((log) => {
                const Icon = autoTypeIcons[log.automationType] ?? Zap;
                return (
                  <div key={log.id} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{log.result}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground capitalize">{log.trigger}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
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
