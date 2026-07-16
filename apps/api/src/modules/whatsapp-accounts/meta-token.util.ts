import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";

/** Normalize tokens pasted from Meta UI, curl, or JSON wrappers. */
export function normalizeMetaAccessToken(raw: string): string {
  let t = raw.trim();
  if (!t) return "";

  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }

  const embedded = t.match(/EAA[A-Za-z0-9+/=_-]{15,}/);
  if (embedded) return embedded[0];

  if (/^EAA/i.test(t.replace(/\s+/g, ""))) {
    return t.replace(/\s+/g, "");
  }

  return t;
}

/** Exchange a short-lived Meta user token for a long-lived token (~60 days). */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
  apiVersion: string,
): Promise<{ accessToken: string; expiresIn: number | null } | null> {
  const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetchWithTimeout(url);
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !body.access_token) {
    return null;
  }

  return {
    accessToken: body.access_token,
    expiresIn: typeof body.expires_in === "number" ? body.expires_in : null,
  };
}

/** Resolve expiry metadata for a Meta user/system token via debug_token. */
export async function debugMetaAccessToken(
  accessToken: string,
  appId: string,
  appSecret: string,
  apiVersion: string,
): Promise<{ valid: boolean; expiresAt: string | null; hoursRemaining: number | null }> {
  const url = new URL(`https://graph.facebook.com/${apiVersion}/debug_token`);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set("access_token", `${appId}|${appSecret}`);

  const res = await fetchWithTimeout(url);
  const body = (await res.json()) as {
    data?: { is_valid?: boolean; expires_at?: number };
    error?: { message?: string };
  };

  if (!res.ok || !body.data) {
    return { valid: false, expiresAt: null, hoursRemaining: null };
  }

  const expiresAtUnix = body.data.expires_at ?? 0;
  if (!expiresAtUnix) {
    return {
      valid: body.data.is_valid !== false,
      expiresAt: null,
      hoursRemaining: null,
    };
  }

  const expiresAt = new Date(expiresAtUnix * 1000);
  const hoursRemaining = Math.max(0, (expiresAt.getTime() - Date.now()) / 3_600_000);
  return {
    valid: body.data.is_valid !== false,
    expiresAt: expiresAt.toISOString(),
    hoursRemaining,
  };
}
