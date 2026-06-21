"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface BillingStatus {
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  razorpayConfigured: boolean;
  plans: Array<{
    id: string;
    name: string;
    priceInr: number;
    description: string;
    available: boolean;
  }>;
}

export function BillingSettingsCard() {
  const token = useAuthStore((s) => s.accessToken);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
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
      window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
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
          : data?.status ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Billing (Razorpay)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            INR subscriptions — UPI, cards, and netbanking via Razorpay.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      ) : (
        <>
          <div className="rounded-xl border border-border/80 bg-[#f8f9ff]/40 px-4 py-3 text-sm">
            <p>
              Current plan: <strong>{data?.planName ?? "Trial"}</strong>
              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                {statusLabel}
              </span>
            </p>
            {data?.currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                Renews {new Date(data.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          {!data?.razorpayConfigured && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200/80">
              Razorpay keys are not set on this API deployment — upgrades are disabled until configured.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {(data?.plans ?? []).map((plan) => {
              const isCurrent = data?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    isCurrent ? "border-accent/40 bg-bento-mint/30" : "border-border/80 bg-white",
                  )}
                >
                  <p className="font-semibold">{plan.name}</p>
                  <p className="mt-1 text-lg font-bold">
                    ₹{plan.priceInr.toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{plan.description}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={isCurrent ? "outline" : "accent"}
                    className="mt-3 w-full rounded-lg text-xs"
                    disabled={
                      isCurrent ||
                      !plan.available ||
                      !data?.razorpayConfigured ||
                      checkoutMutation.isPending
                    }
                    onClick={() => checkoutMutation.mutate(plan.id)}
                  >
                    {checkoutPlan === plan.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrent ? (
                      "Current plan"
                    ) : (
                      <>
                        Upgrade <ExternalLink className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {checkoutMutation.isError && (
        <p className="text-xs text-destructive">
          {checkoutMutation.error instanceof ApiError
            ? checkoutMutation.error.message
            : "Checkout failed."}
        </p>
      )}
    </div>
  );
}
