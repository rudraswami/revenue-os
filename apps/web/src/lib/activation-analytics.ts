/**
 * Client-side activation funnel events.
 * Emits to dataLayer when present; always safe no-op otherwise.
 * North-star: whatsapp_connected → first_inbound → first_classified → pipeline_moved.
 */
export type ActivationEvent =
  | "onboarding_welcome_view"
  | "onboarding_welcome_continue"
  | "onboarding_welcome_skip"
  | "onboarding_connect_later"
  | "onboarding_connect_view"
  | "onboarding_meta_started"
  | "onboarding_meta_cancelled"
  | "onboarding_meta_failed"
  | "onboarding_whatsapp_connected"
  | "onboarding_first_inbound"
  | "onboarding_open_conversations"
  | "onboarding_optional_setup_open"
  | "activation_first_classified"
  | "activation_pipeline_moved"
  | "activation_complete"
  | "activation_home_card_view"
  | "activation_home_card_dismiss"
  | "activation_next_step_click"
  | "conversion_after_proof_view"
  | "conversion_after_proof_dismiss"
  | "conversion_after_proof_click"
  | "team_habit_invite_view"
  | "team_habit_invite_dismiss"
  | "team_habit_invite_click"
  | "activation_ops_truth_view"
  | "activation_ops_truth_upgrade_click"
  | "activation_ops_paid";

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
    surface:
      props?.surface ??
      (event.startsWith("onboarding_") ? "onboarding" : "activation"),
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
