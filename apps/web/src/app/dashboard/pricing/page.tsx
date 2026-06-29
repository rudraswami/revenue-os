"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsageMeterCard } from "@/components/dashboard/usage-meter-card";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { PricingPlansGrid } from "@/components/pricing/pricing-plans-grid";
import { apiFetch, ApiError } from "@/lib/api-client";
import { EnterpriseCallout } from "@/components/marketing/enterprise-callout";
import { PRICING_FOOTNOTES } from "@/lib/pricing-plans";
import { useAuthStore } from "@/stores/auth-store";

interface BillingStatus {
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  razorpayConfigured: boolean;
  entitlements?: {
    trialExpired: boolean;
    trialEndsAt: string | null;
    hasAccess: boolean;
  };
}

export default function PricingPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutOpened, setCheckoutOpened] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiFetch<BillingStatus>("/billing", { token: token ?? undefined }),
    enabled: !!token,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      apiFetch<{ checkoutUrl: string }>("/billing/checkout", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ planId }),
      }),
    onMutate: (planId) => setCheckoutPlan(planId),
    onSuccess: (res) => {
      const opened = window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = res.checkoutUrl;
      } else {
        setCheckoutOpened(true);
      }
    },
    onSettled: () => setCheckoutPlan(null),
  });

  const statusLabel =
    data?.status === "ACTIVE"
      ? "Active"
      : data?.status === "TRIALING"
        ? "Trial"
        : data?.status === "PAST_DUE"
          ? "Payment due"
          : data?.status ?? "Trial";

  return (
    <div className="dashboard-page max-w-[1100px]">
      <PageHeader
        eyebrow="Billing"
        title="Plans & pricing"
        description="Transparent INR pricing. 14-day free trial — upgrade anytime with Razorpay."
      />

      {checkoutOpened && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-bento-mint/40 px-4 py-3 text-sm"
        >
          <p>
            <strong>Razorpay opened in a new tab.</strong> Complete payment there, then return here —
            your plan updates in a few seconds.
          </p>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setCheckoutOpened(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mb-8 h-20 animate-pulse rounded-2xl border border-border/80 bg-[#f8f9ff]/60" />
      )}

      {isError && (
        <p className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t load your current plan. You can still choose a plan below.
        </p>
      )}

      {data && (
        <div className="mb-8 space-y-4">
          <UsageMeterCard />
          <div className="rounded-2xl border border-border/80 bg-[#f8f9ff]/60 px-5 py-4 text-sm">
          <p>
            You&apos;re on <strong>{data.planName}</strong>
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {statusLabel}
            </span>
          </p>
          {data.currentPeriodEnd && (
            <p className="mt-1 text-xs text-muted-foreground">
              Renews {new Date(data.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          {data.entitlements?.trialEndsAt && !data.entitlements.trialExpired && (
            <p className="mt-1 text-xs text-amber-800">
              Trial ends {new Date(data.entitlements.trialEndsAt).toLocaleDateString()}
            </p>
          )}
          {data.entitlements?.trialExpired && (
            <p className="mt-2 text-xs font-medium text-destructive">
              Your trial has ended — choose a plan below to restore access.
            </p>
          )}
          </div>
        </div>
      )}

      {!data?.razorpayConfigured && (
        <p className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Razorpay is not configured on this deployment yet — plan upgrades will open once billing is
          enabled.
        </p>
      )}

      <PricingPlansGrid
        variant="app"
        currentPlanId={data?.planId}
        razorpayConfigured={data?.razorpayConfigured ?? false}
        checkoutPlanId={checkoutPlan}
        onUpgrade={(planId) => checkoutMutation.mutate(planId)}
      />

      <EnterpriseCallout />

      {checkoutMutation.isError && (
        <p className="mt-4 text-sm text-destructive">
          {checkoutMutation.error instanceof ApiError
            ? checkoutMutation.error.message
            : "Checkout failed. Try again or contact support@growvisi.in."}
        </p>
      )}

      <div className="mt-10">
        <RoiCalculator />
      </div>
      <ul className="mt-6 space-y-2 text-[12px] text-muted-foreground">
        {PRICING_FOOTNOTES.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>
    </div>
  );
}
