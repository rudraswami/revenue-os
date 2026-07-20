/**
 * AI Trust Loop events — correction → reclassify path.
 */
export type AiTrustEvent =
  | "ai_correction_open"
  | "ai_correction_submit"
  | "ai_correction_success";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackAiTrust(
  event: AiTrustEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    product: "growvisi",
    surface: "conversations",
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
    console.debug("[ai-trust]", payload);
  }
}
