/**
 * Conversion-at-friction events — upgrade when capacity blocks work.
 */
export type ConversionFrictionEvent =
  | "conversion_friction_view"
  | "conversion_friction_click";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackConversionFriction(
  event: ConversionFrictionEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    product: "growvisi",
    surface: "billing",
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
    console.debug("[conversion-friction]", payload);
  }
}
