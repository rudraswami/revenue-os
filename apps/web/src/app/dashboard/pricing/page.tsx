"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsageMeterCard } from "@/components/dashboard/usage-meter-card";
import { UpgradeFrictionBanner } from "@/components/dashboard/upgrade-friction-banner";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { PricingPlansGrid } from "@/components/pricing/pricing-plans-grid";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { EnterpriseCallout } from "@/components/marketing/enterprise-callout";
import { PRICING_FOOTNOTES } from "@/lib/pricing-plans";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAuthStore } from "@/stores/auth-store";
import { trackConversionFriction } from "@/lib/conversion-friction-analytics";

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
  friction?: {
    primaryReason: string | null;
    suggestedPlan: string | null;
    seatsAtLimit?: boolean;
    leadsAtLimit?: boolean;
    whatsappAtLimit?: boolean;
  };
}

const REASON_COPY: Record<string, string> = {
  seats: "You hit the team seat limit — pick a plan with more seats to invite agents.",
  whatsapp: "You hit the WhatsApp number limit — pick a plan with more lines.",
  leads: "You hit this month's lead cap — upgrade so new WhatsApp leads keep scoring.",
  agency_clients: "Client workspace slots are full on Operator.",
  limit: "Upgrade for more capacity on seats, WhatsApp numbers, or monthly leads.",
};

export default function PricingPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { success } = useToast();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const reasonParam = searchParams.get("reason");
  const planParam = searchParams.get("plan");
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutOpened, setCheckoutOpened] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiFetch<BillingStatus>("/billing", { token: token ?? undefined }),
    enabled: !!token,
  });

  useEffect(() => {
    if (!reasonParam) return;
    trackConversionFriction("conversion_friction_view", {
      reason: reasonParam,
      suggestedPlan: planParam ?? undefined,
      surface: "pricing",
    });
  }, [reasonParam, planParam]);

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
        success(t("toast.checkoutOpened"));
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
        <div className="mb-8 h-20 animate-pulse rounded-2xl border border-border/80 bg-background/60" />
      )}

      {isError && (
        <p className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t load your current plan. You can still choose a plan below.
        </p>
      )}

      {data && (
        <div className="mb-8 space-y-4">
          {(reasonParam || data.friction?.primaryReason) && (
            <UpgradeFrictionBanner
              reason={reasonParam ?? data.friction?.primaryReason ?? "limit"}
              message={
                REASON_COPY[reasonParam ?? data.friction?.primaryReason ?? "limit"] ??
                REASON_COPY.limit
              }
              suggestedPlan={planParam ?? data.friction?.suggestedPlan}
            />
          )}
          <UsageMeterCard />
          <div className="rounded-2xl border border-border/80 bg-background/60 px-5 py-4 text-sm">
          <p>
            You&apos;re on <strong>{data.planName}</strong>
            <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-xs font-bold uppercase text-muted-foreground">
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
          Razorpay billing is not available yet — plan upgrades will open once online payments are
          enabled.
        </p>
      )}

      <PricingPlansGrid
        variant="app"
        currentPlanId={data?.planId}
        highlightPlanId={planParam ?? data?.friction?.suggestedPlan ?? undefined}
        razorpayConfigured={data?.razorpayConfigured ?? false}
        checkoutPlanId={checkoutPlan}
        onUpgrade={(planId) => checkoutMutation.mutate(planId)}
      />

      <EnterpriseCallout />

      {checkoutMutation.isError && (
        <p className="mt-4 text-sm text-destructive">
          {toUserMessage(checkoutMutation.error, "Checkout failed. Try again or contact support@growvisi.in.")}
        </p>
      )}

      <div className="mt-10">
        <RoiCalculator />
      </div>
      <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
        {PRICING_FOOTNOTES.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>
    </div>
  );
}
