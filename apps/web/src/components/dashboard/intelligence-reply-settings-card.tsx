"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  ChevronDown,
  FilePenLine,
  Sparkles,
  Zap,
} from "lucide-react";
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
import { useState } from "react";

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

const MODE_META: Record<
  ReplyAutonomyMode,
  { title: string; subtitle: string; icon: typeof Brain; recommended?: boolean }
> = {
  intel_only: {
    title: "Track only",
    subtitle: "Pipeline & handoffs update. Your team sends every reply.",
    icon: Brain,
  },
  assist: {
    title: "Draft for me",
    subtitle: "AI writes drafts in Conversations. You review and tap Send.",
    icon: FilePenLine,
    recommended: true,
  },
  auto_guarded: {
    title: "WhatsApp auto-reply",
    subtitle: "Instant replies to greetings, thanks & grounded FAQs. You own the rest.",
    icon: Zap,
  },
};

const PRESET_META: Record<
  AutomationPolicyPreset,
  { title: string; example: string }
> = {
  careful: {
    title: "Hello & thanks",
    example: "Only greetings and short acks auto-send.",
  },
  balanced: {
    title: "FAQs from your docs",
    example: "Matched Business Knowledge can auto-send. Pricing needs you.",
  },
  responsive: {
    title: "Broader auto-answers",
    example: "More grounded replies auto-send. Negotiation stays with you.",
  },
};

function outcomeSummary(mode: ReplyAutonomyMode, preset: AutomationPolicyPreset): string {
  if (mode === "intel_only") {
    return "Customers only see messages your team sends. Growvisi classifies and updates pipeline quietly.";
  }
  if (mode === "assist") {
    return "Customers wait for your team. Growvisi pre-fills reply drafts from your Business Knowledge.";
  }
  if (preset === "careful") {
    return "Customers get instant replies to Hi, Thanks, and Great. Everything else waits for your team.";
  }
  if (preset === "responsive") {
    return "Customers get fast replies when docs match. Pricing, complaints, and deals always need you.";
  }
  return "Customers get instant courtesy replies and FAQs when docs match. Pricing and deals need your review.";
}

export function IntelligenceReplySettingsCard({
  layout = "panel",
}: {
  layout?: "panel" | "hero";
}) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [showIndustry, setShowIndustry] = useState(false);

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
      success("Reply settings saved.");
    },
    onError: () => toastError("Could not save reply settings."),
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

  const inner = isLoading ? (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ) : (
    <div className="space-y-5">
      {currentMode === "auto_guarded" && !growthPlanOk && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Growth plan for WhatsApp auto-send</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">
            Drafts still work on Trial/Starter. Upgrade to Growth (₹2,999/mo) to send on WhatsApp.{" "}
            <Link href="/dashboard/pricing" className="font-semibold underline underline-offset-2">
              View plans
            </Link>
          </p>
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step 1 · How should Growvisi help?
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {REPLY_AUTONOMY_MODES.map((mode) => {
            const meta = MODE_META[mode];
            const active = currentMode === mode;
            const Icon = meta.icon;
            const needsGrowth = mode === "auto_guarded" && !growthPlanOk;
            return (
              <button
                key={mode}
                type="button"
                disabled={!canManage || mutation.isPending}
                onClick={() => selectMode(mode)}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-accent bg-bento-mint/50 shadow-sm ring-1 ring-accent/20"
                    : "border-border/70 bg-card hover:border-accent/30 hover:bg-bento-mint/20",
                  !canManage && "cursor-not-allowed opacity-70",
                )}
              >
                {meta.recommended && !active && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                    Popular
                  </span>
                )}
                <div
                  className={cn(
                    "mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
                    active ? "bg-accent text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-foreground">{meta.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.subtitle}</p>
                {needsGrowth && active && (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                    Growth plan
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {currentMode === "auto_guarded" && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step 2 · How much can auto-send?
          </p>
          <div className="flex flex-wrap gap-2">
            {AUTOMATION_POLICY_PRESETS.map((preset) => {
              const meta = PRESET_META[preset];
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
                  title={
                    preset === "responsive" && responsiveBlocked
                      ? "Add Business Knowledge in Intelligence first"
                      : meta.example
                  }
                  onClick={() =>
                    canManage && !disabled && mutation.mutate({ automationPreset: preset })
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-left transition",
                    active
                      ? "border-accent bg-accent text-white shadow-sm"
                      : "border-border/70 bg-card hover:border-accent/30",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className="text-xs font-bold">{meta.title}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {PRESET_META[currentPreset].example}
            {responsiveBlocked && (
              <>
                {" "}
                <Link href="/dashboard/ai" className="font-semibold text-accent hover:underline">
                  Add Business Knowledge
                </Link>{" "}
                to unlock broader auto-send.
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-xs font-semibold text-foreground">What customers experience</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {outcomeSummary(currentMode, currentPreset)}
          </p>
        </div>
      </div>

      <div className="border-t border-border/60 pt-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          onClick={() => setShowIndustry((v) => !v)}
        >
          <span>Fine-tune for your industry (optional)</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition", showIndustry && "rotate-180")}
          />
        </button>
        {showIndustry && (
          <div className="pb-1 pt-2">
            <IndustryHandbookPicker
              canManage={canManage}
              currentIndustryId={data?.industryId}
              token={token}
            />
          </div>
        )}
      </div>

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          View-only access. Ask an admin or manager to change reply settings.
        </p>
      )}
    </div>
  );

  if (layout === "hero") {
    return inner;
  }

  return (
    <DashboardPanel
      title="Reply policy"
      description="How Growvisi helps on WhatsApp. Use I'll handle this in a thread when you want to reply yourself."
    >
      {inner}
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
        <p className="text-xs text-muted-foreground">
          Active:{" "}
          <span className="font-medium text-foreground">
            {handbooks.find((h) => h.id === currentIndustryId)?.label ?? currentIndustryId}
          </span>
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Applies starter voice, escalation, and sample knowledge for your business type.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {handbooks.map((hb) => (
          <button
            key={hb.id}
            type="button"
            disabled={!canManage || applyMutation.isPending}
            onClick={() => canManage && applyMutation.mutate(hb.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition",
              currentIndustryId === hb.id
                ? "border-accent/35 bg-bento-mint/40"
                : "border-border/50 bg-card hover:border-accent/20",
              !canManage && "cursor-not-allowed opacity-70",
            )}
          >
            <p className="text-xs font-semibold text-foreground">{hb.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hb.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
