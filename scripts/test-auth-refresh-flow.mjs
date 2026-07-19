#!/usr/bin/env node
/**
 * Simulates the client refresh flow that caused 15-minute logouts:
 * login → persist refresh → shell bootstrap (/auth/me) → refresh at expiry.
 *
 * Usage: node scripts/test-auth-refresh-flow.mjs
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
  if (!session.refreshToken) throw new Error("No refreshToken in login body");
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

async function refreshWithBody(refreshToken) {
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
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

  const { session, cookie } = await login();
  let refreshToken = session.refreshToken;
  let accessToken = session.accessToken;

  // Simulate page reload: only refreshToken in "localStorage", cookie may or may not work
  console.log("\n1. /auth/me with access token (shell bootstrap)");
  const meStatus = await me(accessToken);
  console.log("   /auth/me:", meStatus === 200 ? "ok" : `FAIL ${meStatus}`);

  console.log("\n2. Refresh via HttpOnly cookie (browser primary path)");
  const byCookie = await refreshWithCookie(cookie);
  console.log("   status:", byCookie.status, byCookie.status === 201 ? "ok" : byCookie.body);

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

  const failed = [meStatus, byCookie.status, byBody.status, again.status].some((s) => s !== 200 && s !== 201);
  if (failed) {
    console.error("\nFAIL — refresh chain broken");
    process.exit(1);
  }
  console.log("\nPASS — refresh chain works; deploy web+api fixes for applyMeResponse + SameSite=None");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
