"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { trackActivation } from "@/lib/activation-analytics";
import { useAuthStore } from "@/stores/auth-store";
import { canManageBilling } from "@/lib/permissions";
import { useGlobalDashboardBanner } from "@/components/dashboard/use-global-dashboard-banner";

const DISMISS_KEY = "growvisi-conversion-after-proof-dismissed";

/**
 * Soft upgrade after First Value — only on trial, after AI classify,
 * and when urgent trial banners are not already showing.
 */
export function ConversionAfterProofBanner() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const globalBanner = useGlobalDashboardBanner();
  const [dismissed, setDismissed] = useState(true);
  const viewedRef = useRef(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () =>
      apiFetch<{
        planId?: string;
        entitlements?: {
          planId: string;
          hasAccess: boolean;
          trialExpired: boolean;
          trialEndsAt: string | null;
          requiresUpgrade: boolean;
        };
      }>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<{ aiClassified: boolean; pipelineMoved: boolean; allComplete: boolean }>(
        "/organizations/onboarding-progress",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 30_000,
  });

  const ent = billing?.entitlements;
  const planId = ent?.planId ?? billing?.planId ?? "trial";
  const onTrial = planId === "trial";
  const trialEndsSoon =
    !!ent?.trialEndsAt &&
    new Date(ent.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  const show =
    !dismissed &&
    canManageBilling(role) &&
    globalBanner !== "trial" &&
    onTrial &&
    !!ent?.hasAccess &&
    !trialEndsSoon &&
    !!progress?.aiClassified;

  useEffect(() => {
    if (!show || viewedRef.current) return;
    viewedRef.current = true;
    trackActivation("conversion_after_proof_view", {
      surface: "home",
      pipelineMoved: progress?.pipelineMoved,
      allComplete: progress?.allComplete,
    });
  }, [show, progress?.pipelineMoved, progress?.allComplete]);

  if (!show) return null;

  const proofLine = progress?.pipelineMoved
    ? "Leads are scoring and your pipeline is moving."
    : "AI is scoring your WhatsApp leads.";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce9ff] bg-gradient-to-r from-[#ecfdf5]/80 to-white px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Your revenue loop is working</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {proofLine} Lock in Growvisi before the trial ends — from ₹999/mo.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
            trackActivation("conversion_after_proof_dismiss", { surface: "home" });
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <Button asChild size="sm" className="h-8 gap-1.5 rounded-xl">
          <Link
            href="/dashboard/pricing"
            onClick={() => trackActivation("conversion_after_proof_click", { surface: "home" })}
          >
            View plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
