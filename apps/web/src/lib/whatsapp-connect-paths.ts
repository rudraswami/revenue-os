/** Meta Embedded Signup connect paths (see facebook-sdk buildExtras). */
export type WhatsappConnectPath = "cloud_api" | "business_app";

export const WHATSAPP_CONNECT_PATHS = {
  cloud_api: {
    id: "cloud_api" as const,
    title: "WhatsApp Business API number",
    description:
      "You already use WhatsApp on Meta Cloud API, or you're setting up a dedicated business line.",
    featureType: undefined as string | undefined,
  },
  business_app: {
    id: "business_app" as const,
    title: "WhatsApp Business app (keep the app)",
    description:
      "Coexistence — keep replying from the mobile app while Growvisi classifies and tracks pipeline.",
    featureType: "whatsapp_business_app_onboarding",
  },
} as const;

export function connectMethodForPath(path: WhatsappConnectPath): "embedded" | "embedded_coex" {
  return path === "business_app" ? "embedded_coex" : "embedded";
}
