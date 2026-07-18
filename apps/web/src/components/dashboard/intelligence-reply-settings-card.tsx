"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IntelligenceWorkspaceSettings, ReplyAutonomyMode } from "@growvisi/shared";
import { REPLY_AUTONOMY_MODES } from "@growvisi/shared";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageCampaigns } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const LABELS: Record<ReplyAutonomyMode, { title: string; description: string }> = {
  intel_only: {
    title: "Classify only",
    description: "AI updates pipeline and handoffs — no reply drafts in Conversations.",
  },
  assist: {
    title: "AI assist (recommended)",
    description: "AI drafts replies from your Business Knowledge — your team reviews and sends.",
  },
  auto_guarded: {
    title: "Guarded auto-reply (preview)",
    description:
      "Same as assist today. FAQ auto-send on WhatsApp ships when policy gates are live — you stay in control.",
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

  const mutation = useMutation({
    mutationFn: (replyAutonomy: ReplyAutonomyMode) =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ replyAutonomy }),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(["intelligence-settings"], next);
      success("Intelligence reply settings saved.");
    },
    onError: () => toastError("Could not save intelligence settings."),
  });

  const current = data?.replyAutonomy ?? "assist";

  return (
    <DashboardPanel
      title="AI reply policy"
      description="Workspace default for Conversations. Per-thread Human / AI assist still overrides."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {REPLY_AUTONOMY_MODES.map((mode) => {
            const meta = LABELS[mode];
            const active = current === mode;
            return (
              <button
                key={mode}
                type="button"
                disabled={!canManage || mutation.isPending}
                onClick={() => canManage && mutation.mutate(mode)}
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
      )}
    </DashboardPanel>
  );
}
