/** Razorpay Standard Checkout for subscription auth (replaces broken short_url redirect). */

export interface RazorpayCheckoutSession {
  subscriptionId: string;
  razorpayKeyId: string;
  planName: string;
  priceInr: number;
  customerEmail: string;
  customerName?: string | null;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is only available in the browser."));
  }
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function openRazorpaySubscriptionCheckout(
  session: RazorpayCheckoutSession,
  opts?: { onSuccess?: () => void; onDismiss?: () => void },
): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout failed to initialize.");
  }

  const rzp = new window.Razorpay({
    key: session.razorpayKeyId,
    subscription_id: session.subscriptionId,
    name: "Growvisi",
    description: `${session.planName} — ₹${session.priceInr.toLocaleString("en-IN")}/mo`,
    image: "https://www.growvisi.in/icon-192.png",
    prefill: {
      name: session.customerName?.trim() || undefined,
      email: session.customerEmail,
    },
    theme: { color: "#0d9488" },
    handler: () => {
      opts?.onSuccess?.();
    },
    modal: {
      ondismiss: () => {
        opts?.onDismiss?.();
      },
    },
  });

  rzp.open();
}
