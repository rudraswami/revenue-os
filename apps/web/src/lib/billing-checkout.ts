import { apiFetch } from "@/lib/api-client";
import { openRazorpaySubscriptionCheckout } from "@/lib/razorpay-checkout";

export interface BillingCheckoutResponse {
  subscriptionId?: string;
  razorpayKeyId?: string;
  planId?: string;
  planName?: string;
  priceInr?: number;
  customerEmail?: string;
  customerName?: string | null;
  planChange?: boolean;
  paymentRetry?: boolean;
  message?: string;
}

export async function runBillingCheckout(
  planId: string,
  token: string | undefined,
  callbacks: {
    onPlanChange: (message: string) => void;
    onPaymentSuccess: () => void;
    onPaymentRetry?: (message: string) => void;
  },
): Promise<void> {
  const res = await apiFetch<BillingCheckoutResponse>("/billing/checkout", {
    method: "POST",
    token,
    body: JSON.stringify({ planId }),
  });

  if (res.planChange) {
    callbacks.onPlanChange(res.message ?? "Plan updated.");
    return;
  }

  if (res.paymentRetry) {
    callbacks.onPaymentRetry?.(res.message ?? "Complete payment to restore access.");
  }

  if (
    !res.subscriptionId ||
    !res.razorpayKeyId ||
    !res.planName ||
    res.priceInr == null ||
    !res.customerEmail
  ) {
    throw new Error("Checkout could not be started. Try again or contact it@growvisi.com.");
  }

  await openRazorpaySubscriptionCheckout(
    {
      subscriptionId: res.subscriptionId,
      razorpayKeyId: res.razorpayKeyId,
      planName: res.planName,
      priceInr: res.priceInr,
      customerEmail: res.customerEmail,
      customerName: res.customerName,
    },
    { onSuccess: callbacks.onPaymentSuccess },
  );
}
