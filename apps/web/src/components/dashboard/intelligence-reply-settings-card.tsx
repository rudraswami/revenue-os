"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AutomationPolicyPreset,
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
    description: "Auto-send when Business Knowledge matches. Pricing and negotiation need review.",
  },
  responsive: {
    title: "Responsive",
    description: "Broader auto-send when grounded — still never on complaints or legal issues.",
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

  return (
    <DashboardPanel
      title="Reply policy"
      description="How Growvisi helps on WhatsApp. Use I'll handle this in a thread when you want to reply yourself."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {REPLY_AUTONOMY_MODES.map((mode) => {
              const meta = MODE_LABELS[mode];
              const active = currentMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={!canManage || mutation.isPending}
                  onClick={() => canManage && mutation.mutate({ replyAutonomy: mode })}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-accent/40 bg-bento-mint/50 shadow-sm"
                      : "border-border/60 bg-card hover:border-accent/25",
                    !canManage && "cursor-not-allowed opacity-70",
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{meta.title}</p>
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
                  <Link href="/dashboard/automations" className="font-medium text-foreground underline-offset-2 hover:underline">
                    Add Business Knowledge
                  </Link>{" "}
                  before enabling Responsive auto-send.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardPanel>
  );
}
