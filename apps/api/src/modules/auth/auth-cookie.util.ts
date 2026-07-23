import type { CookieOptions, Request, Response } from "express";
import {
  GROWVISI_PRODUCT_TLDS,
  growvisiCookieDomain,
  parseGrowvisiHostname,
  parseGrowvisiOrigin,
} from "@growvisi/shared";
import { sanitizeEnvValue } from "../../config/cors-origins";

export const REFRESH_COOKIE = "growvisi_rt";

/** Refresh cookie is scoped to the auth routes only (refresh + logout). */
const COOKIE_PATH = "/api/v1/auth";

function isProd(): boolean {
  // Use NODE_ENV only — local .env often copies VERCEL=1 from Vercel CLI for Turbo,
  // which would force Secure+SameSite=None cookies on http://localhost and break refresh.
  return process.env.NODE_ENV === "production";
}

/** Sanitized COOKIE_DOMAIN for Set-Cookie (e.g. `.growvisi.in`). Primary TLD fallback. */
export function cookieDomain(): string | undefined {
  const raw = sanitizeEnvValue(process.env.COOKIE_DOMAIN);
  if (!raw) return undefined;
  // Leading dot shares cookie across subdomains (www ↔ api).
  if (isProd() && !raw.startsWith(".")) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auth-cookie] COOKIE_DOMAIN="${raw}" should start with "." in production (e.g. .growvisi.in).`,
    );
  }
  return raw;
}

/** Resolve cookie domain from request Origin/Referer/Host; falls back to COOKIE_DOMAIN env. */
export function resolveCookieDomainForRequest(req?: Request): string | undefined {
  if (!req) return cookieDomain();

  const fromOrigin =
    parseGrowvisiOrigin(req.headers.origin) ?? parseGrowvisiOrigin(req.headers.referer);
  if (fromOrigin) return growvisiCookieDomain(fromOrigin);

  const fromHost = parseGrowvisiHostname(req.headers.host);
  if (fromHost) return growvisiCookieDomain(fromHost);

  return cookieDomain();
}

function refreshMaxAgeMs(): number {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const match = /^(\d+)([smhd])$/.exec(raw.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return Number(match[1]) * (multipliers[match[2]] ?? multipliers.d);
}

function baseOptions(req?: Request): CookieOptions {
  const prod = isProd();
  // www → api.growvisi.in is cross-origin; None+Secure is required for reliable
  // cookie round-trip on credentialed fetch in all major browsers.
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "none" : "lax",
    domain: resolveCookieDomainForRequest(req),
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string, req?: Request): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(req), maxAge: refreshMaxAgeMs() });
}

/** Clears refresh cookie for the request TLD and all configured product TLDs. */
export function clearRefreshCookie(res: Response, req?: Request): void {
  const primary = baseOptions(req);
  res.clearCookie(REFRESH_COOKIE, primary);

  const cleared = new Set<string>();
  if (primary.domain) cleared.add(primary.domain);

  for (const tld of GROWVISI_PRODUCT_TLDS) {
    const domain = growvisiCookieDomain(tld);
    if (cleared.has(domain)) continue;
    cleared.add(domain);
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: primary.secure,
      sameSite: primary.sameSite,
      domain,
      path: COOKIE_PATH,
    });
  }
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[REFRESH_COOKIE]?.trim() || undefined;
}
