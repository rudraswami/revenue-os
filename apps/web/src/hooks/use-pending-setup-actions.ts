"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export type MilestoneStatus = "complete" | "current" | "upcoming" | "blocked";

export type SetupMilestone = {
  id: string;
  phaseId: string;
  label: string;
  description: string;
  href: string;
  status: MilestoneStatus;
  critical: boolean;
};

export type SetupPhase = {
  id: string;
  label: string;
  tagline: string;
  milestones: SetupMilestone[];
  complete: boolean;
};

export type SetupSystemStatus = "ready" | "in_progress" | "attention";

export type SetupSystemState = {
  phases: SetupPhase[];
  milestones: SetupMilestone[];
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  pendingCount: number;
  criticalCount: number;
  nextAction: SetupMilestone | null;
  status: SetupSystemStatus;
  headline: string;
  subhead: string;
};

type OnboardingProgress = {
  whatsappConnected: boolean;
  firstInbound: boolean;
  aiClassified: boolean;
  pipelineMoved: boolean;
};

function ms(
  phaseId: string,
  id: string,
  label: string,
  description: string,
  href: string,
  done: boolean,
  isCurrent: boolean,
  critical = false,
): SetupMilestone {
  return {
    id,
    phaseId,
    label,
    description,
    href,
    critical,
    status: done ? "complete" : isCurrent ? "current" : "upcoming",
  };
}

export function useSetupSystem() {
  const token = useAuthStore((s) => s.accessToken);

  const query = useQuery({
    queryKey: ["setup-system"],
    queryFn: async (): Promise<SetupSystemState> => {
      const [billing, progress, accounts, health, ops, payment, capabilities] =
        await Promise.all([
          apiFetch<{
            entitlements?: {
              trialExpired: boolean;
              trialEndsAt: string | null;
              hasAccess: boolean;
              planId: string;
            };
          }>("/billing", { token: token ?? undefined }),
          apiFetch<OnboardingProgress>("/organizations/onboarding-progress", {
            token: token ?? undefined,
          }),
          apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
            token: token ?? undefined,
          }),
          apiFetch<{
            tokenHealth?: { valid?: boolean; needsRefresh: boolean };
          }>("/whatsapp-accounts/connection-health", { token: token ?? undefined }).catch(
            () => ({ tokenHealth: undefined }),
          ),
          apiFetch<{ digest: { enabled: boolean } }>("/organizations/ops-settings", {
            token: token ?? undefined,
          }),
          apiFetch<{ hasWebhookSecret: boolean; autoWinOnPayment: boolean }>(
            "/organizations/payment-integration",
            { token: token ?? undefined },
          ).catch(() => null),
          apiFetch<{ aiClassification: boolean }>("/conversations/capabilities", {
            token: token ?? undefined,
          }).catch(() => ({ aiClassification: true })),
        ]);

      const connected = accounts?.some((a) => a.isActive) ?? false;
      const th = health?.tokenHealth;
      const ent = billing?.entitlements;
      const tokenOk = !connected || !th || (th.valid !== false && !th.needsRefresh);

      const trialOk = ent?.hasAccess !== false && !ent?.trialExpired;
      const trialEndsSoon =
        ent?.hasAccess &&
        ent.trialEndsAt &&
        new Date(ent.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

      const planOk = trialOk && !trialEndsSoon;
      const waConnected = progress.whatsappConnected;
      const firstInbound = progress.firstInbound;
      const aiDone = progress.aiClassified || !capabilities.aiClassification;
      const pipelineDone = progress.pipelineMoved;
      const digestOn = ops.digest.enabled;
      const onGrowthPlus = ent?.planId === "growth" || ent?.planId === "pro";
      const razorpayDone = !onGrowthPlus || (payment?.hasWebhookSecret && payment.autoWinOnPayment);

      // Activation chain — only one "current" at a time
      const activationCurrent = !firstInbound
        ? "first-inbound"
        : !aiDone
          ? "ai-classify"
          : !pipelineDone
            ? "pipeline-move"
            : null;

      const accountCurrent = !planOk ? (ent?.trialExpired ? "trial-ended" : "trial-soon") : null;
      const channelCurrent = planOk && !waConnected
        ? "connect-wa"
        : planOk && waConnected && !tokenOk
          ? "token-health"
          : null;

      const revenueCurrent =
        planOk && waConnected && tokenOk && pipelineDone && !digestOn
          ? "digest"
          : planOk &&
              waConnected &&
              tokenOk &&
              pipelineDone &&
              digestOn &&
              onGrowthPlus &&
              payment &&
              !razorpayDone
            ? "razorpay"
            : null;

      const accountMilestones: SetupMilestone[] = [
        ms(
          "account",
          "plan-active",
          "Workspace active",
          trialEndsSoon
            ? `Trial ends ${new Date(ent!.trialEndsAt!).toLocaleDateString()} — pick a plan`
            : ent?.trialExpired
              ? "Trial ended — upgrade to keep running"
              : "Trial or paid plan is active",
          "/dashboard/pricing",
          planOk,
          accountCurrent === "trial-soon" || accountCurrent === "trial-ended",
          !planOk,
        ),
      ];

      const channelMilestones: SetupMilestone[] = [
        ms(
          "channel",
          "connect-wa",
          "WhatsApp channel live",
          "Embedded signup or Meta token — your business line ingests messages",
          "/dashboard/settings?tab=whatsapp",
          waConnected,
          channelCurrent === "connect-wa",
          !waConnected,
        ),
        ms(
          "channel",
          "token-health",
          "Meta connection healthy",
          "Access token valid — messages flow without interruption",
          "/dashboard/settings?tab=whatsapp",
          waConnected && tokenOk,
          channelCurrent === "token-health",
          waConnected && !tokenOk,
        ),
        ms(
          "channel",
          "first-inbound",
          "First customer message",
          "Growvisi ingests inbound WhatsApp automatically",
          "/dashboard/inbox",
          firstInbound,
          activationCurrent === "first-inbound",
          false,
        ),
      ];

      const engineMilestones: SetupMilestone[] = [
        ms(
          "engine",
          "ai-classify",
          "AI classification running",
          "Intent, score, and handoff on every thread",
          "/dashboard/inbox",
          aiDone && firstInbound,
          activationCurrent === "ai-classify",
          false,
        ),
        ms(
          "engine",
          "pipeline-move",
          "Pipeline tracking ₹",
          "Move a deal — revenue pulse activates on Home",
          "/dashboard/pipeline",
          pipelineDone,
          activationCurrent === "pipeline-move",
          false,
        ),
        ms(
          "engine",
          "digest",
          "Owner digest armed",
          "Morning brief on email or WhatsApp — pipeline ₹ & handoffs",
          "/dashboard/automations",
          digestOn,
          revenueCurrent === "digest",
          false,
        ),
      ];

      const paymentMilestones: SetupMilestone[] = onGrowthPlus
        ? [
            ms(
              "payments",
              "razorpay",
              "Razorpay → Won",
              "Payment webhook auto-marks deals won — full attribution",
              "/dashboard/settings?tab=growth",
              !!razorpayDone,
              revenueCurrent === "razorpay",
              false,
            ),
          ]
        : [];

      const phases: SetupPhase[] = [
        {
          id: "account",
          label: "Account",
          tagline: "Billing & access",
          milestones: accountMilestones,
          complete: accountMilestones.every((m) => m.status === "complete"),
        },
        {
          id: "channel",
          label: "WhatsApp",
          tagline: "Channel & ingest",
          milestones: channelMilestones,
          complete: channelMilestones.every((m) => m.status === "complete"),
        },
        {
          id: "engine",
          label: "Revenue engine",
          tagline: "Classify → pipeline → alerts",
          milestones: engineMilestones,
          complete: engineMilestones.every((m) => m.status === "complete"),
        },
        ...(paymentMilestones.length
          ? [
              {
                id: "payments",
                label: "Payments",
                tagline: "Razorpay attribution",
                milestones: paymentMilestones,
                complete: paymentMilestones.every((m) => m.status === "complete"),
              },
            ]
          : []),
      ];

      const milestones = phases.flatMap((p) => p.milestones);
      const totalCount = milestones.length;
      const completedCount = milestones.filter((m) => m.status === "complete").length;
      const pending = milestones.filter((m) => m.status !== "complete");
      const criticalCount = pending.filter((m) => m.critical || m.status === "current").length;

      const nextAction =
        pending.find((m) => m.critical) ??
        pending.find((m) => m.status === "current") ??
        pending[0] ??
        null;

      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

      let status: SetupSystemStatus = "ready";
      if (progressPercent < 100) {
        status = pending.some((m) => m.critical) ? "attention" : "in_progress";
      }

      const headline =
        status === "ready"
          ? "Revenue OS ready"
          : status === "attention"
            ? "Action needed on your setup"
            : "Growvisi is setting up your revenue OS";

      const subhead =
        status === "ready"
          ? "All systems configured — focus on closing deals."
          : nextAction
            ? `Next: ${nextAction.label}`
            : `${completedCount} of ${totalCount} checkpoints complete`;

      return {
        phases,
        milestones,
        progressPercent,
        completedCount,
        totalCount,
        pendingCount: pending.length,
        criticalCount,
        nextAction,
        status,
        headline,
        subhead,
      };
    },
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    ...query.data,
    phases: query.data?.phases ?? [],
    milestones: query.data?.milestones ?? [],
    progressPercent: query.data?.progressPercent ?? 0,
    completedCount: query.data?.completedCount ?? 0,
    totalCount: query.data?.totalCount ?? 0,
    pendingCount: query.data?.pendingCount ?? 0,
    criticalCount: query.data?.criticalCount ?? 0,
    nextAction: query.data?.nextAction ?? null,
    status: query.data?.status ?? "in_progress",
    headline: query.data?.headline ?? "Loading setup…",
    subhead: query.data?.subhead ?? "",
    isLoading: query.isLoading && !query.data,
    refetch: query.refetch,
  };
}

/** @deprecated use useSetupSystem */
export function usePendingSetupActions() {
  const sys = useSetupSystem();
  return {
    actions: (sys.nextAction ? [sys.nextAction] : []).map((m) => ({
      id: m.id,
      title: m.label,
      description: m.description,
      href: m.href,
      priority: m.critical ? ("critical" as const) : ("recommended" as const),
      order: 0,
    })),
    criticalCount: sys.criticalCount,
    totalCount: sys.pendingCount,
    allComplete: sys.status === "ready",
    isLoading: sys.isLoading,
  };
}

export type SetupAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: "critical" | "recommended";
  order: number;
};
