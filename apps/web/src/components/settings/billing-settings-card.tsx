"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ExternalLink } from "lucide-react";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface BillingStatus {
  planId: string;
  planName: string;
  status: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd: string | null;
  razorpayConfigured: boolean;
  usage?: { whatsappNumbers: number; teamMembers: number; monthlyLeads: number };
  limits?: { whatsappNumbers: number; teamMembers: number; monthlyLeads: number };
  entitlements?: {
    trialExpired: boolean;
    trialEndsAt: string | null;
    hasAccess: boolean;
  };
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
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const { data, isLoading } = useShellBilling<BillingStatus>({ preferFresh: true });

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
        success(t("toast.checkoutOpened"));
      }
    },
    onError: () => toastError(t("toast.actionFailed")),
    onSettled: () => setCheckoutPlan(null),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; message: string }>("/billing/cancel", {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: (res) => {
      setCancelMsg(res.message);
      invalidateWorkspaceShellCache(qc);
    },
  });

  const canCancel =
    data?.razorpayConfigured &&
    data.status === "ACTIVE" &&
    data.planId !== "trial" &&
    !data.cancelAtPeriodEnd;

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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bento-mint text-accent">
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
          <div className="rounded-xl border border-border/80 bg-background/40 px-4 py-3 text-sm">
            <p>
              Current plan: <strong>{data?.planName ?? "Trial"}</strong>
              <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-xs font-bold uppercase text-muted-foreground">
                {statusLabel}
              </span>
            </p>
            {data?.currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {data.cancelAtPeriodEnd ? "Access until" : "Renews"}{" "}
                {new Date(data.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {data?.cancelAtPeriodEnd && (
              <p className="mt-1 text-xs text-warning">
                Cancellation scheduled — you keep full access until the date above.
              </p>
            )}
            {data?.usage && data?.limits && (
              <p className="mt-2 text-xs text-muted-foreground">
                {data.usage.whatsappNumbers}/{data.limits.whatsappNumbers} numbers ·{" "}
                {data.usage.teamMembers}/{data.limits.teamMembers} team ·{" "}
                {data.usage.monthlyLeads.toLocaleString("en-IN")}/
                {data.limits.monthlyLeads.toLocaleString("en-IN")} leads this month
              </p>
            )}
            {data?.entitlements?.trialEndsAt && !data.entitlements.trialExpired && (
              <p className="mt-1 text-xs text-warning">
                Trial ends {new Date(data.entitlements.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {!data?.razorpayConfigured && (
            <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 border border-warning/30">
              Online payments are not available yet — upgrades will open once Razorpay is connected.
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
                    isCurrent ? "border-accent/40 bg-bento-mint/30" : "border-border/80 bg-card",
                  )}
                >
                  <p className="font-semibold">{plan.name}</p>
                  <p className="mt-1 text-lg font-bold">
                    ₹{plan.priceInr.toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
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
                      <GrowvisiSpinner size="xs" />
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

          {canCancel && (
            <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
              <p className="text-sm font-semibold">Cancel subscription</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cancels at end of the current billing period. You keep access until then.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 rounded-lg text-xs text-destructive hover:text-destructive"
                disabled={cancelMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Cancel your subscription at the end of this billing period?",
                    )
                  ) {
                    setCancelMsg(null);
                    cancelMutation.mutate();
                  }
                }}
              >
                {cancelMutation.isPending ? (
                  <GrowvisiSpinner size="xs" />
                ) : (
                  "Cancel subscription"
                )}
              </Button>
              {cancelMsg && (
                <p className="mt-2 text-xs text-muted-foreground">{cancelMsg}</p>
              )}
              {cancelMutation.isError && (
                <p className="mt-2 text-xs text-destructive">
                  {toUserMessage(cancelMutation.error, "Could not cancel subscription.")}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {checkoutMutation.isError && (
        <p className="text-xs text-destructive">
          {toUserMessage(checkoutMutation.error, "Checkout failed.")}
        </p>
      )}
    </div>
  );
}
