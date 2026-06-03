/** Canonical production domains for GrowthSync. */
/** Primary URL (Vercel redirects apex → www). */
export const GROWTHSYNC_WEB_URL = "https://www.growthsync.in";
export const GROWTHSYNC_WEB_URL_APEX = "https://growthsync.in";
export const GROWTHSYNC_API_URL = "https://api.growthsync.in";
export const GROWTHSYNC_API_V1_URL = `${GROWTHSYNC_API_URL}/api/v1`;
export const GROWTHSYNC_WS_URL = "wss://api.growthsync.in";
export const GROWTHSYNC_WEBHOOK_URL = `${GROWTHSYNC_API_V1_URL}/webhooks/whatsapp`;

/** Comma-separated for CORS_ORIGINS env. */
export const GROWTHSYNC_CORS_ORIGINS = `${GROWTHSYNC_WEB_URL_APEX},${GROWTHSYNC_WEB_URL}`;

export const GROWTHSYNC_EMAIL_FROM = "GrowthSync <noreply@growthsync.in>";
