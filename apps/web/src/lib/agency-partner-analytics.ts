/**
 * Agency hub + Partner kit funnel events (dataLayer).
 */
export type AgencyPartnerEvent =
  | "agency_hub_view"
  | "agency_enable_click"
  | "agency_enable_success"
  | "agency_client_created"
  | "agency_es_started"
  | "agency_es_success"
  | "agency_reconnect_click"
  | "agency_invite_owner"
  | "agency_client_renamed"
  | "agency_client_removed"
  | "partner_kit_view"
  | "partner_step_click"
  | "partner_open_agency"
  | "partner_copy_email";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackAgencyPartner(
  event: AgencyPartnerEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    product: "growvisi",
    surface: event.startsWith("partner_") ? "partner" : "agency",
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
    console.debug("[agency-partner]", payload);
  }
}
