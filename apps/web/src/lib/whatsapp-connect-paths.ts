/** Meta Embedded Signup connect paths (see facebook-sdk buildExtras). */
export type WhatsappConnectPath = "cloud_api" | "business_app";

export const WHATSAPP_CONNECT_PATHS = {
  cloud_api: {
    id: "cloud_api" as const,
    /** Plain-language headline for SMB owners */
    title: "I use WhatsApp API already",
    subtitle: "Cloud API, WATI, Interakt, or another platform",
    description:
      "You already have a business line on Meta Cloud API — or you're migrating from another WhatsApp tool.",
    featureType: undefined as string | undefined,
    badge: undefined as string | undefined,
    icon: "api" as const,
  },
  business_app: {
    id: "business_app" as const,
    title: "I reply from my phone",
    subtitle: "WhatsApp Business app on Android or iPhone",
    description:
      "Most shops and clinics use this. Keep chatting from your phone — Growvisi classifies messages and tracks deals in Pipeline.",
    featureType: "whatsapp_business_app_onboarding",
    badge: "Most common",
    icon: "phone" as const,
  },
} as const;

/** Default for Indian SMB ICP — phone-first WhatsApp Business app users. */
export const DEFAULT_WHATSAPP_CONNECT_PATH: WhatsappConnectPath = "business_app";

export function connectMethodForPath(path: WhatsappConnectPath): "embedded" | "embedded_coex" {
  return path === "business_app" ? "embedded_coex" : "embedded";
}
