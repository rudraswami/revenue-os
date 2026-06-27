export interface PaymentIntegrationSettings {
  /** Merchant Razorpay webhook secret — verifies payment.captured events */
  razorpayWebhookSecret: string | null;
  /** When true, payment.captured moves matching lead to Won */
  autoWinOnPayment: boolean;
}

export const DEFAULT_PAYMENT_INTEGRATION: PaymentIntegrationSettings = {
  razorpayWebhookSecret: null,
  autoWinOnPayment: true,
};

export function normalizePaymentIntegration(raw: unknown): PaymentIntegrationSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const secret =
    typeof o.razorpayWebhookSecret === "string" ? o.razorpayWebhookSecret.trim() : "";
  return {
    razorpayWebhookSecret: secret || null,
    autoWinOnPayment: o.autoWinOnPayment !== false,
  };
}
