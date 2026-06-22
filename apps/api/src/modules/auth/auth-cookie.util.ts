import type { CookieOptions, Request, Response } from "express";

export const REFRESH_COOKIE = "growvisi_rt";

/** Refresh cookie is scoped to the auth routes only (refresh + logout). */
const COOKIE_PATH = "/api/v1/auth";

function isProd(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function refreshMaxAgeMs(): number {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
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

function baseOptions(): CookieOptions {
  // Web and API live on different subdomains (www.growvisi.in ↔ api.growvisi.in),
  // so cross-site requests need SameSite=None; Secure. COOKIE_DOMAIN (e.g.
  // ".growvisi.in") lets the cookie be shared across subdomains when set.
  const prod = isProd();
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: refreshMaxAgeMs() });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[REFRESH_COOKIE]?.trim() || undefined;
}
