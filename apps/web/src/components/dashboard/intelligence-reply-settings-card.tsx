"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AutomationPolicyPreset,
  GrowvisiPlanId,
  IntelligenceWorkspaceSettings,
  IntelligenceWorkspaceSettingsPatch,
  ReplyAutonomyMode,
} from "@growvisi/shared";
import { AUTOMATION_POLICY_PRESETS, REPLY_AUTONOMY_MODES } from "@growvisi/shared";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageCampaigns } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

const MODE_LABELS: Record<ReplyAutonomyMode, { title: string; description: string }> = {
  intel_only: {
    title: "Classify only",
    description: "AI updates pipeline and handoffs — no reply suggestions.",
  },
  assist: {
    title: "Suggest replies",
    description: "AI drafts from your Business Knowledge — your team always sends.",
  },
  auto_guarded: {
    title: "Send simple replies",
    description:
      "Growvisi can send low-risk, grounded replies on WhatsApp. Complaints, pricing, and deal terms stay with your team.",
  },
};

const PRESET_LABELS: Record<AutomationPolicyPreset, { title: string; description: string }> = {
  careful: {
    title: "Careful",
    description: "Auto-send greetings and thanks only. Everything else is a draft.",
  },
  balanced: {
    title: "Balanced",
    description:
      "Auto-send when Business Knowledge matches. Pricing and negotiation need review.",
  },
  responsive: {
    title: "Responsive",
    description:
      "Broader auto-send when grounded. Greetings still auto-send in Negotiation; Proposal stays with your team.",
  },
};

export function IntelligenceReplySettingsCard() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiFetch<{ planId: GrowvisiPlanId }>("/billing", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: kbHealth } = useQuery({
    queryKey: ["knowledge-health"],
    queryFn: () =>
      apiFetch<{
        chunkCount: number;
        gapRiskScore: number;
        readyForResponsivePreset: boolean;
      }>("/knowledge/health", { token: token ?? undefined }),
    enabled: !!token,
  });

  const growthPlanOk = PLAN_RANK[billing?.planId ?? "trial"] >= PLAN_RANK.growth;
  const responsiveBlocked = kbHealth != null && !kbHealth.readyForResponsivePreset;

  const mutation = useMutation({
    mutationFn: (patch: IntelligenceWorkspaceSettingsPatch) =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(["intelligence-settings"], next);
      success("Reply policy saved.");
    },
    onError: () => toastError("Could not save reply policy."),
  });

  const currentMode = data?.replyAutonomy ?? "assist";
  const currentPreset = data?.automationPreset ?? "balanced";

  function selectMode(mode: ReplyAutonomyMode) {
    if (!canManage) return;
    const patch: IntelligenceWorkspaceSettingsPatch = { replyAutonomy: mode };
    if (mode === "auto_guarded" && !data?.automationPreset) {
      patch.automationPreset = "balanced";
    }
    mutation.mutate(patch);
  }

  return (
    <DashboardPanel
      title="Reply policy"
      description="How Growvisi helps on WhatsApp. Use I'll handle this in a thread when you want to reply yourself."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {currentMode === "auto_guarded" && !growthPlanOk && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950">
              <p className="font-semibold">Growth plan required for WhatsApp auto-send</p>
              <p className="mt-1 leading-relaxed opacity-90">
                Growvisi will still draft replies on Trial/Starter. Upgrade to Growth (₹2,999/mo) for
                guarded auto-send on WhatsApp.{" "}
                <Link href="/dashboard/pricing" className="font-medium underline underline-offset-2">
                  View plans
                </Link>
              </p>
            </div>
          )}

          <div className="space-y-2">
            {REPLY_AUTONOMY_MODES.map((mode) => {
              const meta = MODE_LABELS[mode];
              const active = currentMode === mode;
              const needsGrowth = mode === "auto_guarded" && !growthPlanOk;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={!canManage || mutation.isPending}
                  onClick={() => selectMode(mode)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-accent/40 bg-bento-mint/50 shadow-sm"
                      : "border-border/60 bg-card hover:border-accent/25",
                    !canManage && "cursor-not-allowed opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{meta.title}</p>
                    {needsGrowth && active && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                        Growth+
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>

          {currentMode === "auto_guarded" && (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Auto-send preset
              </p>
              {AUTOMATION_POLICY_PRESETS.map((preset) => {
                const meta = PRESET_LABELS[preset];
                const active = currentPreset === preset;
                const disabled =
                  !canManage ||
                  mutation.isPending ||
                  (preset === "responsive" && responsiveBlocked);
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      canManage && !disabled && mutation.mutate({ automationPreset: preset })
                    }
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition",
                      active
                        ? "border-accent/35 bg-bento-mint/40"
                        : "border-border/50 bg-muted/20 hover:border-accent/20",
                      disabled && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <p className="text-xs font-semibold text-foreground">{meta.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {preset === "responsive" && responsiveBlocked
                        ? "Upload Business Knowledge first — Responsive needs indexed docs to auto-send safely."
                        : meta.description}
                    </p>
                  </button>
                );
              })}
              {responsiveBlocked && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <Link
                    href="/dashboard/automations"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    Add Business Knowledge
                  </Link>{" "}
                  before enabling Responsive auto-send.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-border/60 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Industry employee handbook
            </p>
            <IndustryHandbookPicker
              canManage={canManage}
              currentIndustryId={data?.industryId}
              token={token}
            />
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}

function IndustryHandbookPicker({
  canManage,
  currentIndustryId,
  token,
}: {
  canManage: boolean;
  currentIndustryId?: string;
  token: string | null;
}) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: handbooks } = useQuery({
    queryKey: ["industry-handbooks"],
    queryFn: () =>
      apiFetch<Array<{ id: string; label: string; description: string }>>(
        "/organizations/industry-handbooks",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const applyMutation = useMutation({
    mutationFn: (industryId: string) =>
      apiFetch<{ message: string; intelligence: IntelligenceWorkspaceSettings }>(
        "/organizations/apply-industry-handbook",
        {
          method: "POST",
          token: token ?? undefined,
          body: JSON.stringify({ industryId, seedKnowledge: true }),
        },
      ),
    onSuccess: (res) => {
      queryClient.setQueryData(["intelligence-settings"], res.intelligence);
      queryClient.invalidateQueries({ queryKey: ["knowledge-health"] });
      success(res.message);
    },
    onError: () => toastError("Could not apply industry handbook."),
  });

  if (!handbooks?.length) return null;

  return (
    <div className="space-y-2">
      {currentIndustryId ? (
        <p className="text-[11px] text-muted-foreground">
          Active:{" "}
          <span className="font-medium text-foreground">
            {handbooks.find((h) => h.id === currentIndustryId)?.label ?? currentIndustryId}
          </span>
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Tune voice, escalation, and starter knowledge for your business type.
        </p>
      )}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {handbooks.map((hb) => (
          <button
            key={hb.id}
            type="button"
            disabled={!canManage || applyMutation.isPending}
            onClick={() => canManage && applyMutation.mutate(hb.id)}
            className={cn(
              "rounded-lg border px-2.5 py-2 text-left transition",
              currentIndustryId === hb.id
                ? "border-accent/35 bg-bento-mint/40"
                : "border-border/50 bg-muted/20 hover:border-accent/20",
              !canManage && "cursor-not-allowed opacity-70",
            )}
          >
            <p className="text-xs font-semibold text-foreground">{hb.label}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hb.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
