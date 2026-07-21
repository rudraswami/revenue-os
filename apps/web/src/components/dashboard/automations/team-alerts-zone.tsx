"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ChevronDown,
  Clock,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Sun,
  Timer,
  UserRound,
  Zap,
} from "lucide-react";
import type { GrowvisiPlanId } from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageCampaigns, canManageTeam } from "@/lib/permissions";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { useToast } from "@/components/ui/toast";
import { CONVERSATIONS } from "@/lib/brand-copy";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
} from "@/lib/automation-preferences";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

type DigestChannel = "email" | "whatsapp" | "both";

const DIGEST_HOURS = [
  { value: 6, label: "6:00 AM IST" },
  { value: 7, label: "7:00 AM IST" },
  { value: 8, label: "8:00 AM IST" },
  { value: 9, label: "9:00 AM IST" },
  { value: 10, label: "10:00 AM IST" },
];

const TEAM_ALERTS: Array<{
  id: Exclude<AutomationId, "welcome">;
  icon: typeof Bell;
  title: string;
  description: string;
  planLocked?: boolean;
}> = [
  {
    id: "notify",
    icon: Bell,
    title: "Hot lead alert",
    description: "Email owners when a lead score hits 70 or higher.",
  },
  {
    id: "handoff",
    icon: UserRound,
    title: `${CONVERSATIONS.yourTurn} task`,
    description: `Create a task and email when AI flags ${CONVERSATIONS.waitingOnYou.toLowerCase()}.`,
  },
  {
    id: "followup",
    icon: Clock,
    title: "Follow-up reminder",
    description: "Daily email when a conversation waited 24+ hours without a reply.",
  },
  {
    id: "stage",
    icon: Zap,
    title: "Auto stage update",
    description: "Move leads forward when classification confidence is high.",
  },
  {
    id: "staleDeal",
    icon: Timer,
    title: "Stale deal reminder",
    description: "Daily task when a deal sits 3+ days in the same stage.",
    planLocked: true,
  },
  {
    id: "stageNotify",
    icon: Bell,
    title: "Stage change alert",
    description: "Email when a teammate manually moves a lead to a new stage.",
  },
];

export function TeamAlertsZone() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const isAdmin = canManageTeam(role);
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const [digestOpen, setDigestOpen] = useState(false);

  const { data: toggles, isLoading } = useQuery({
    queryKey: ["automation-preferences"],
    queryFn: () =>
      apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    initialData: DEFAULT_AUTOMATIONS,
  });

  const { data: billing } = useShellBilling<{ planId: GrowvisiPlanId }>();

  const growthPlanOk = PLAN_RANK[billing?.planId ?? "trial"] >= PLAN_RANK.growth;

  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    queryFn: () =>
      apiFetch<{
        totalRuns30d: number;
        byType: Array<{ type: string; count: number }>;
      }>("/automations/stats", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: ops, isLoading: opsLoading } = useQuery({
    queryKey: ["ops-settings"],
    queryFn: () =>
      apiFetch<{
        digest: {
          enabled: boolean;
          hourIst: number;
          channel: DigestChannel;
          whatsappPhone?: string | null;
          whatsappTemplateName?: string | null;
          digestLocale?: "en" | "hi";
          lastSentDate?: string | null;
        };
      }>("/organizations/ops-settings", { token: token ?? undefined }),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<Record<AutomationId, boolean>>) =>
      apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["automation-preferences"] });
      const previous = queryClient.getQueryData<Record<AutomationId, boolean>>([
        "automation-preferences",
      ]);
      if (previous) {
        queryClient.setQueryData(["automation-preferences"], { ...previous, ...patch });
      }
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["automation-preferences"], data);
    },
    onError: (e, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["automation-preferences"], context.previous);
      }
      toastError(
        e instanceof Error && e.message.includes("Growth")
          ? "Stale deal reminder requires the Growth plan."
          : "Could not save. Please try again.",
      );
    },
  });

  const digestMutation = useMutation({
    mutationFn: (patch: {
      digest?: {
        enabled?: boolean;
        hourIst?: number;
        channel?: DigestChannel;
        whatsappPhone?: string | null;
        whatsappTemplateName?: string | null;
        digestLocale?: "en" | "hi";
      };
    }) =>
      apiFetch("/organizations/ops-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ops-settings"] }),
  });

  const activeCount = Object.entries(toggles ?? DEFAULT_AUTOMATIONS).filter(
    ([id, on]) => id !== "welcome" && on,
  ).length;

  const totalRuns = stats?.totalRuns30d ?? 0;

  function toggle(id: AutomationId, enabled: boolean) {
    mutation.mutate({ [id]: enabled });
  }

  return (
    <section aria-labelledby="team-alerts-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="team-alerts-heading" className="text-lg font-bold tracking-tight text-foreground">
            Team alerts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email alerts and pipeline updates for your team — separate from customer replies.
          </p>
        </div>
        {activeCount > 0 && totalRuns > 0 ? (
          <p className="text-xs font-medium text-muted-foreground">
            <Activity className="mr-1 inline h-3.5 w-3.5 text-accent" aria-hidden />
            {totalRuns} team actions last 30 days
          </p>
        ) : null}
      </div>

      {!canManage ? (
        <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          View-only access. Ask an admin or manager to change team alerts.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {TEAM_ALERTS.map((alert) => {
              const enabled = toggles?.[alert.id] ?? DEFAULT_AUTOMATIONS[alert.id];
              const runCount = stats?.byType.find((b) => b.type === alert.id)?.count ?? 0;
              const planLocked = alert.planLocked && !growthPlanOk;
              const Icon = alert.icon;

              return (
                <li
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 sm:px-5",
                    enabled && !planLocked && "bg-bento-mint/15",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      enabled && !planLocked ? "bg-accent text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                      {planLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                          <Lock className="h-3 w-3" aria-hidden />
                          Growth
                        </span>
                      ) : null}
                      {runCount > 0 ? (
                        <span className="text-[11px] text-muted-foreground">{runCount} runs</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
                    {planLocked ? (
                      <Link
                        href="/dashboard/pricing?plan=growth"
                        className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
                      >
                        Upgrade to Growth →
                      </Link>
                    ) : null}
                  </div>
                  <Switch
                    checked={enabled && !planLocked}
                    disabled={!canManage || mutation.isPending || planLocked}
                    onCheckedChange={(v) => toggle(alert.id, v)}
                    aria-label={`${alert.title} team alert`}
                  />
                </li>
              );
            })}

            {/* Morning digest row */}
            <li className="bg-muted/10">
              <button
                type="button"
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left sm:px-5"
                onClick={() => setDigestOpen((v) => !v)}
                aria-expanded={digestOpen}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    ops?.digest.enabled ? "bg-warning text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Sun className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Morning revenue digest</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pipeline ₹, hot leads &amp; chats waiting on you — by email or WhatsApp
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {ops?.digest.enabled ? (
                    <span className="hidden text-[11px] font-medium text-accent sm:inline">On</span>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition",
                      digestOpen && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {digestOpen && !opsLoading && ops ? (
                <div className="border-t border-border/60 px-4 pb-4 pt-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span className="text-xs font-medium text-muted-foreground">Daily digest</span>
                    </div>
                    <Switch
                      checked={ops.digest.enabled}
                      disabled={!isAdmin || digestMutation.isPending}
                      onCheckedChange={(enabled) => digestMutation.mutate({ digest: { enabled } })}
                      aria-label="Morning revenue digest"
                    />
                  </div>

                  {isAdmin && ops.digest.enabled ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Channel</span>
                        <Select
                          value={ops.digest.channel ?? "email"}
                          onChange={(e) =>
                            digestMutation.mutate({
                              digest: { channel: e.target.value as DigestChannel },
                            })
                          }
                          className="h-9 text-xs"
                          disabled={digestMutation.isPending}
                        >
                          <option value="email">Email only</option>
                          <option value="whatsapp">WhatsApp only</option>
                          <option value="both">Email + WhatsApp</option>
                        </Select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Send at</span>
                        <Select
                          value={String(ops.digest.hourIst)}
                          onChange={(e) =>
                            digestMutation.mutate({ digest: { hourIst: Number(e.target.value) } })
                          }
                          className="h-9 text-xs"
                          disabled={digestMutation.isPending}
                        >
                          {DIGEST_HOURS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {(ops.digest.channel === "whatsapp" || ops.digest.channel === "both") && (
                        <label className="block space-y-1 sm:col-span-2">
                          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp number for digest
                          </span>
                          <Input
                            placeholder="10-digit mobile"
                            defaultValue={ops.digest.whatsappPhone ?? ""}
                            className="h-9 text-xs"
                            disabled={digestMutation.isPending}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (ops.digest.whatsappPhone ?? "")) {
                                digestMutation.mutate({ digest: { whatsappPhone: v || null } });
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ) : null}

                  {!isAdmin ? (
                    <p className="mt-2 text-xs text-muted-foreground">Ask an admin to change digest settings.</p>
                  ) : null}

                  {digestMutation.isPending ? (
                    <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}

                  {ops.digest.lastSentDate ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Last sent {ops.digest.lastSentDate}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          </ul>
        )}
      </div>

      {activeCount === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 px-4 py-3 text-center text-sm text-muted-foreground">
          No team alerts on yet. Enable <strong className="font-medium text-foreground">Hot lead alert</strong> to
          get emailed when a serious buyer messages.
        </p>
      ) : null}
    </section>
  );
}
