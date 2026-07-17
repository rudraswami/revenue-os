"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { trackActivation } from "@/lib/activation-analytics";
import { canManageBilling } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

type OpsProgress = {
  whatsappConnected: boolean;
  ops?: {
    stage: "setup" | "activating" | "activated" | "acting" | "paying" | "at_risk";
    activated: boolean;
    firstValue: boolean;
    firstAction: boolean;
    paid: boolean;
    planId: string;
    subscriptionStatus: string;
    hasAccess: boolean;
    trialEndsAt: string | null;
    requiresUpgrade: boolean;
    daysSinceConnect: number | null;
    proof: {
      inboundMessages: number;
      classifiedLeads: number;
      outboundMessages: number;
      teamMembers: number;
    };
  };
};

const STAGE_LABEL: Record<NonNullable<OpsProgress["ops"]>["stage"], string> = {
  setup: "Setup",
  activating: "Activating",
  activated: "Activated",
  acting: "Acting on leads",
  paying: "Paying",
  at_risk: "Trial ending soon",
};

function planLabel(planId: string, paid: boolean, trialEndsAt: string | null) {
  if (paid) {
    return planId === "trial" ? "Paid" : `${planId.charAt(0).toUpperCase()}${planId.slice(1)}`;
  }
  if (trialEndsAt) {
    const days = Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    if (days <= 0) return "Trial ended";
    return `Trial · ${days}d left`;
  }
  return "Trial";
}

/**
 * Owner glance only — commercial stage + proof.
 * Actions live in the FAB (WorkspaceAssistFab), not a second checklist here.
 */
export function WorkspaceOpsTruthStrip() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const viewedRef = useRef(false);

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () => apiFetch<{ isAgency: boolean }>("/agency/status", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<OpsProgress>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token && !agencyStatus?.isAgency,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const ops = progress?.ops;

  useEffect(() => {
    if (!ops || viewedRef.current) return;
    viewedRef.current = true;
    trackActivation("activation_ops_truth_view", {
      stage: ops.stage,
      paid: ops.paid,
      firstValue: ops.firstValue,
      firstAction: ops.firstAction,
    });
  }, [ops]);

  if (agencyStatus?.isAgency) return null;
  if (!canManageBilling(role)) return null;
  if (!progress?.whatsappConnected || !ops || ops.stage === "setup") return null;

  const showUpgrade = !ops.paid && (ops.requiresUpgrade || ops.stage === "at_risk");

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce9ff] bg-gradient-to-r from-[#f8f9ff] to-white px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Workspace · {STAGE_LABEL[ops.stage]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ops.proof.classifiedLeads} classified · {ops.proof.outboundMessages} replies ·{" "}
          {ops.proof.teamMembers} on team
          {ops.daysSinceConnect != null ? ` · day ${ops.daysSinceConnect + 1}` : ""}
          {" · "}
          {planLabel(ops.planId, ops.paid, ops.trialEndsAt)}
        </p>
      </div>
      {showUpgrade ? (
        <Link
          href="/dashboard/pricing"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-foreground hover:bg-muted"
          onClick={() =>
            trackActivation("activation_ops_truth_upgrade_click", { stage: ops.stage })
          }
        >
          See plans
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
