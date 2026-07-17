/**
 * Post-activation coaching events (digest → invite → takeover).
 */
export type CoachingEvent =
  | "coaching_next_view"
  | "coaching_next_click"
  | "coaching_takeover_prompt_view"
  | "coaching_takeover_complete";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackCoaching(
  event: CoachingEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    product: "growvisi",
    surface: props?.surface ?? "coaching",
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
    console.debug("[coaching]", payload);
  }
}
