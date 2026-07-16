/**
 * Client-side activation funnel events.
 * Emits to dataLayer when present; always safe no-op otherwise.
 * North-star candidates: whatsapp_connected, first_inbound, first_classified.
 */
export type ActivationEvent =
  | "onboarding_welcome_view"
  | "onboarding_welcome_continue"
  | "onboarding_welcome_skip"
  | "onboarding_connect_view"
  | "onboarding_meta_started"
  | "onboarding_meta_cancelled"
  | "onboarding_meta_failed"
  | "onboarding_whatsapp_connected"
  | "onboarding_first_inbound"
  | "onboarding_open_conversations"
  | "onboarding_optional_setup_open";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackActivation(
  event: ActivationEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    product: "growvisi",
    surface: "onboarding",
    ...props,
    ts: Date.now(),
  };

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[activation]", payload);
  }
}
