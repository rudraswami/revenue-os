/** Canonical production domains for Growvisi (.in is primary; .com is parallel). */

export const GROWVISI_PRODUCT_TLDS = ["in", "com"] as const;
export type GrowvisiProductTld = (typeof GROWVISI_PRODUCT_TLDS)[number];

/** Primary TLD — canonical links, Meta webhooks, and env defaults stay here. */
export const GROWVISI_PRIMARY_TLD: GrowvisiProductTld = "in";

/** Primary URL (Vercel redirects apex → www). */
export const GROWVISI_WEB_URL = "https://www.growvisi.in";
export const GROWVISI_WEB_URL_APEX = "https://growvisi.in";
export const GROWVISI_API_URL = "https://api.growvisi.in";
export const GROWVISI_API_V1_URL = `${GROWVISI_API_URL}/api/v1`;
export const GROWVISI_WS_URL = "wss://api.growvisi.in";
export const GROWVISI_WEBHOOK_URL = `${GROWVISI_API_V1_URL}/webhooks/whatsapp`;

/** Parallel .com web origins (same Vercel deployment as .in). */
export const GROWVISI_WEB_URL_COM = "https://www.growvisi.com";
export const GROWVISI_WEB_URL_APEX_COM = "https://growvisi.com";
export const GROWVISI_API_URL_COM = "https://api.growvisi.com";
export const GROWVISI_API_V1_URL_COM = `${GROWVISI_API_URL_COM}/api/v1`;
export const GROWVISI_WS_URL_COM = "wss://api.growvisi.com";

/** Comma-separated for CORS_ORIGINS env (both TLDs). */
export const GROWVISI_CORS_ORIGINS = [
  GROWVISI_WEB_URL_APEX,
  GROWVISI_WEB_URL,
  GROWVISI_WEB_URL_APEX_COM,
  GROWVISI_WEB_URL_COM,
].join(",");

export const GROWVISI_EMAIL_FROM = "Growvisi <it@growvisi.in>";
/** Public support address (inbox may be .com; Resend sends from verified @growvisi.in). */
export const GROWVISI_EMAIL_SUPPORT = "it@growvisi.com";
export const GROWVISI_EMAIL_PRIVACY = "privacy@growvisi.in";
export const GROWVISI_EMAIL_LEGAL = "legal@growvisi.in";
export const GROWVISI_META_DATA_DELETION_URL = `${GROWVISI_API_V1_URL}/webhooks/meta/data-deletion`;

/** Mailto for concierge WhatsApp onboarding help. */
export const GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO =
  `mailto:${GROWVISI_EMAIL_SUPPORT}?subject=${encodeURIComponent("Help connecting my WhatsApp number")}`;

function normalizeHostname(hostname: string | null | undefined): string {
  return (hostname ?? "").trim().toLowerCase().split(":")[0] ?? "";
}

/** Returns `in` | `com` when host is a known Growvisi product hostname. */
export function parseGrowvisiHostname(
  hostname: string | null | undefined,
): GrowvisiProductTld | null {
  const host = normalizeHostname(hostname);
  if (!host) return null;
  for (const tld of GROWVISI_PRODUCT_TLDS) {
    if (
      host === `growvisi.${tld}` ||
      host === `www.growvisi.${tld}` ||
      host === `api.growvisi.${tld}`
    ) {
      return tld;
    }
  }
  return null;
}

/** Parse TLD from a full origin URL (`https://www.growvisi.com`). */
export function parseGrowvisiOrigin(origin: string | null | undefined): GrowvisiProductTld | null {
  if (!origin?.trim()) return null;
  try {
    return parseGrowvisiHostname(new URL(origin.trim()).hostname);
  } catch {
    return null;
  }
}

export function growvisiCookieDomain(tld: GrowvisiProductTld): string {
  return `.growvisi.${tld}`;
}

export function growvisiApiOrigin(tld: GrowvisiProductTld): string {
  return `https://api.growvisi.${tld}`;
}

export function growvisiWebOrigin(tld: GrowvisiProductTld, www = true): string {
  return www ? `https://www.growvisi.${tld}` : `https://growvisi.${tld}`;
}

export function growvisiWsOrigin(tld: GrowvisiProductTld): string {
  return `wss://api.growvisi.${tld}`;
}

export function resolveGrowvisiTld(
  hostname: string | null | undefined,
  fallback: GrowvisiProductTld = GROWVISI_PRIMARY_TLD,
): GrowvisiProductTld {
  return parseGrowvisiHostname(hostname) ?? fallback;
}

export function resolveGrowvisiCookieDomain(
  hostname: string | null | undefined,
  fallback: GrowvisiProductTld = GROWVISI_PRIMARY_TLD,
): string {
  return growvisiCookieDomain(resolveGrowvisiTld(hostname, fallback));
}

export function resolveGrowvisiApiV1Url(
  hostname: string | null | undefined,
  fallback: GrowvisiProductTld = GROWVISI_PRIMARY_TLD,
): string {
  return `${growvisiApiOrigin(resolveGrowvisiTld(hostname, fallback))}/api/v1`;
}

export function resolveGrowvisiWsUrl(
  hostname: string | null | undefined,
  fallback: GrowvisiProductTld = GROWVISI_PRIMARY_TLD,
): string {
  return growvisiWsOrigin(resolveGrowvisiTld(hostname, fallback));
}
