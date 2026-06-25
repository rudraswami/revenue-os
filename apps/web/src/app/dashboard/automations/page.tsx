"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
} from "@/lib/automation-preferences";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Activity, Bell, Clock, MessageCircle, Sparkles, Zap } from "lucide-react";

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
    description: "Email owners when a lead score hits 80 or higher.",
    impact: "Close faster",
    serverNote: "Email alert when enabled",
  },
];

function timeAgo(date: string | Date) {
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function AutomationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: toggles, isLoading } = useQuery({
    queryKey: ["automation-preferences"],
    queryFn: () => apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    initialData: DEFAULT_AUTOMATIONS,
  });

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
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Workflows"
        title="Automations"
        description="Server-side workflows that help your team close faster — saved per workspace."
        badge={
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
            {activeCount} active
          </span>
        }
        action={
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard/ai">Intelligence</Link>
          </Button>
        }
      />

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid gap-4 sm:grid-cols-3"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-gradient-to-r from-bento-mint/40 to-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.totalRuns30d ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Runs last 30 days</p>
          </div>
        </div>
        {(stats?.byType ?? []).slice(0, 2).map((bt) => {
          const Icon = autoTypeIcons[bt.type] ?? Zap;
          return (
            <div key={bt.type} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bento-mint text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bt.count}</p>
                <p className="text-[11px] capitalize text-muted-foreground">{bt.type} runs</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      <DashboardPanel
        noPadding
        className="mb-8 border-accent/20 bg-gradient-to-r from-bento-mint/40 to-white"
        delay={0.05}
      >
        <div className="p-5 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="font-semibold">AI-powered revenue workflows</p>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Stage updates and hot-lead alerts fire when AI classifies messages. Follow-up reminders
            run once daily via scheduled job. All executions are logged below.
          </p>
        </div>
      </DashboardPanel>

      {mutation.isError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Couldn&apos;t save that change. Please try again.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {SERVER_AUTOMATIONS.map((a) => (
            <div key={a.id} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <DashboardPanel noPadding className="border-accent/20 bg-gradient-to-r from-bento-mint/30 to-white">
            <div className="flex flex-row items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">Welcome & first reply</h3>
                  <span className="rounded-full bg-[#f8f9ff] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Meta Business Agent
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  First replies happen inside WhatsApp via Meta — Growvisi classifies intent from the
                  full thread. No toggle needed here.
                </p>
                <p className="mt-2 text-xs font-medium text-accent">Always on via WhatsApp</p>
              </div>
            </div>
          </DashboardPanel>

          {SERVER_AUTOMATIONS.map((auto, i) => {
            const enabled = toggles?.[auto.id] ?? DEFAULT_AUTOMATIONS[auto.id];
            const runCount = stats?.byType.find((b) => b.type === auto.id)?.count ?? 0;
            return (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <DashboardPanel noPadding className={enabled ? "border-accent/25 ring-1 ring-accent/10" : ""}>
                <div className="flex flex-row items-start gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      enabled ? "bg-accent text-white" : "bg-[#ecfdf5] text-accent"
                    }`}
                  >
                    <auto.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{auto.title}</h3>
                      <span className="rounded-full bg-[#f8f9ff] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {auto.impact}
                      </span>
                      {runCount > 0 && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {runCount} runs
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{auto.description}</p>
                    <p className="mt-2 text-xs font-medium text-accent">
                      {enabled ? auto.serverNote : "Off"}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={mutation.isPending}
                    onCheckedChange={(v) => toggle(auto.id, v)}
                    aria-label={`${auto.title} automation`}
                  />
                </div>
              </DashboardPanel>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Automation execution log */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
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
              {logs.map((log, i) => {
                const Icon = autoTypeIcons[log.automationType] ?? Zap;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{log.result}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">{log.trigger}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(log.createdAt)}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </DashboardPanel>
      </motion.div>
    </div>
  );
}
