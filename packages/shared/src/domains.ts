/** Canonical production domains for Growvisi. */
/** Primary URL (Vercel redirects apex → www). */
export const GROWVISI_WEB_URL = "https://www.growvisi.in";
export const GROWVISI_WEB_URL_APEX = "https://growvisi.in";
export const GROWVISI_API_URL = "https://api.growvisi.in";
export const GROWVISI_API_V1_URL = `${GROWVISI_API_URL}/api/v1`;
export const GROWVISI_WS_URL = "wss://api.growvisi.in";
export const GROWVISI_WEBHOOK_URL = `${GROWVISI_API_V1_URL}/webhooks/whatsapp`;

/** Comma-separated for CORS_ORIGINS env. */
export const GROWVISI_CORS_ORIGINS = `${GROWVISI_WEB_URL_APEX},${GROWVISI_WEB_URL}`;

export const GROWVISI_EMAIL_FROM = "Growvisi <noreply@growvisi.in>";
export const GROWVISI_EMAIL_SUPPORT = "support@growvisi.in";
export const GROWVISI_EMAIL_PRIVACY = "privacy@growvisi.in";
export const GROWVISI_EMAIL_LEGAL = "legal@growvisi.in";
export const GROWVISI_META_DATA_DELETION_URL = `${GROWVISI_API_V1_URL}/webhooks/meta/data-deletion`;

/** Mailto for concierge WhatsApp onboarding help. */
export const GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO =
  `mailto:${GROWVISI_EMAIL_SUPPORT}?subject=${encodeURIComponent("Help connecting my WhatsApp number")}`;
