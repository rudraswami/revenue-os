#!/usr/bin/env node
/**
 * Auth refresh integration tests — run against production or local API.
 *
 * Usage: node scripts/test-auth-refresh-flow.mjs
 *
 * Tests:
 *  1. Login + cookie/body refresh chain
 *  2. Stale cookie + valid body (simulates browser that blocks Set-Cookie after rotation)
 */
const API = process.env.SMOKE_API_URL ?? "https://api.growvisi.in/api/v1";
const ORIGIN = process.env.SMOKE_WEB_URL ?? "https://www.growvisi.in";
const email = process.env.SMOKE_EMAIL ?? "meta.reviewer@growvisi.in";
const password = process.env.SMOKE_PASSWORD ?? "MetaReview2026!Growvisi";

function decodeJwtExp(token) {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  return payload.exp;
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${res.status}: ${await res.text()}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  const session = await res.json();
  const cookie = cookies.find((c) => c.startsWith("growvisi_rt="))?.split(";")[0];
  if (!cookie) throw new Error("No growvisi_rt Set-Cookie on login");
  const sameSite = cookies[0].match(/SameSite=(\w+)/i)?.[1];
  console.log("login ok — cookie SameSite:", sameSite);
  return { session, cookie };
}

async function refreshWithCookie(cookie) {
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    credentials: "include",
  });
  return { status: res.status, body: res.ok ? await res.json() : await res.text() };
}

async function refreshWithBody(refreshToken, { staleCookie } = { staleCookie: undefined }) {
  const headers = { "Content-Type": "application/json", Origin: ORIGIN };
  if (staleCookie) headers.Cookie = staleCookie;
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken }),
    credentials: "include",
  });
  return { status: res.status, body: res.ok ? await res.json() : await res.text() };
}

async function me(accessToken) {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, Origin: ORIGIN },
  });
  return res.status;
}

async function main() {
  console.log("Auth refresh flow test\n");

  const { session, cookie: cookieR0 } = await login();
  let refreshToken = session.refreshToken;
  let accessToken = session.accessToken;

  console.log("\n1. /auth/me with access token (shell bootstrap)");
  const meStatus = await me(accessToken);
  console.log("   /auth/me:", meStatus === 200 ? "ok" : `FAIL ${meStatus}`);

  console.log("\n2. Refresh via HttpOnly cookie (browser primary path)");
  const byCookie = await refreshWithCookie(cookieR0);
  console.log("   status:", byCookie.status, byCookie.status === 201 ? "ok" : byCookie.body);
  if (byCookie.status === 201) {
    refreshToken = byCookie.body.refreshToken;
    accessToken = byCookie.body.accessToken;
  }

  console.log("\n3. Refresh via body token (localStorage fallback after reload)");
  const byBody = await refreshWithBody(refreshToken);
  console.log("   status:", byBody.status, byBody.status === 201 ? "ok" : byBody.body);
  if (byBody.status === 201) {
    accessToken = byBody.body.accessToken;
    refreshToken = byBody.body.refreshToken;
  }

  const exp = decodeJwtExp(accessToken);
  const ttlSec = exp - Math.floor(Date.now() / 1000);
  console.log("\n4. Access token TTL:", Math.round(ttlSec / 60), "minutes (expect ~15)");

  console.log("\n5. Second body refresh (simulates proactive refresh at ~10 min)");
  const again = await refreshWithBody(refreshToken);
  console.log("   status:", again.status, again.status === 201 ? "ok" : again.body);
  if (again.status === 201) {
    refreshToken = again.body.refreshToken;
  }

  console.log(
    "\n6. STALE COOKIE + VALID BODY (P0 regression — caused 15-min logout)",
  );
  console.log("   Simulates: cookie jar stuck on R0 after rotation, zustand has R1");
  const staleCookieResult = await refreshWithBody(refreshToken, { staleCookie: cookieR0 });
  console.log(
    "   status:",
    staleCookieResult.status,
    staleCookieResult.status === 201 ? "ok (server fell through to body)" : staleCookieResult.body,
  );

  const failed = [
    meStatus,
    byCookie.status,
    byBody.status,
    again.status,
    staleCookieResult.status,
  ].some((s) => s !== 200 && s !== 201);

  if (failed) {
    console.error("\nFAIL — refresh chain broken");
    process.exit(1);
  }
  console.log("\nPASS — refresh chain + stale-cookie fallback work");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
