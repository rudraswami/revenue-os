import { loadRootEnv } from "./load-root-env.mjs";

loadRootEnv();

const API_URL = (() => {
  const raw = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000/api/v1"
  ).replace(/\/$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
})();

export function getApiUrl() {
  return API_URL;
}

/**
 * Obtain JWT for certification probes.
 * Prefers CERTIFY_TOKEN / E2E_TOKEN; otherwise logs in with E2E_EMAIL + E2E_PASSWORD.
 */
export async function getCertifyToken() {
  const existing = process.env.CERTIFY_TOKEN || process.env.E2E_TOKEN;
  if (existing?.trim()) return existing.trim();

  const email = process.env.E2E_EMAIL || process.env.SEED_USER_EMAIL || "demo@growvisi.com";
  const password =
    process.env.E2E_PASSWORD || process.env.SEED_USER_PASSWORD || "demo123456";

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 429) {
    throw new Error(
      "Login rate-limited (429). Set CERTIFY_TOKEN or wait ~60s before retrying.",
    );
  }
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${body.message || "unknown"}`);
  }
  if (body.needsOrganizationSelection) {
    const orgId = body.organizations?.[0]?.id;
    if (!orgId) throw new Error("Login needs org selection but no organizations returned");
    const res2 = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password, organizationId: orgId }),
    });
    const body2 = await res2.json().catch(() => ({}));
    if (!res2.ok || !body2.accessToken) {
      throw new Error(`Org login failed (${res2.status}): ${body2.message || "unknown"}`);
    }
    return body2.accessToken;
  }
  if (!body.accessToken) {
    throw new Error("Login response missing accessToken");
  }
  return body.accessToken;
}

export async function getCertifyConversationId(token) {
  if (process.env.CERTIFY_CONVERSATION_ID?.trim()) {
    return process.env.CERTIFY_CONVERSATION_ID.trim();
  }

  const res = await fetch(`${API_URL}/conversations?page=1&pageSize=5`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`List conversations failed (${res.status}): ${body.message || "unknown"}`);
  }
  const id = body.data?.[0]?.id ?? body.items?.[0]?.id;
  if (!id) {
    throw new Error("No conversations found — run pnpm seed:inbox-cert after db:seed");
  }
  return id;
}
