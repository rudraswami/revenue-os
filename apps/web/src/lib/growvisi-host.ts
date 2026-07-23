import {
  GROWVISI_API_V1_URL,
  GROWVISI_WS_URL,
  parseGrowvisiHostname,
  resolveGrowvisiApiV1Url,
  resolveGrowvisiWsUrl,
} from "@growvisi/shared";

function sanitizeEnvUrl(value: string | undefined, fallback: string): string {
  const raw = (value ?? fallback).replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
  return raw.replace(/\/$/, "");
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Host from Next.js request headers (SSR / RSC). */
export function hostFromRequestHeaders(
  headers: Pick<Headers, "get"> | { get(name: string): string | null },
): string | null {
  return headers.get("x-forwarded-host") ?? headers.get("host");
}

/**
 * API base URL (`…/api/v1`) for the current Growvisi host.
 * Production .in/.com hosts resolve at runtime; localhost and Vercel previews use env.
 */
export function resolveApiBaseUrl(hostname?: string | null): string {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : null);

  if (host && parseGrowvisiHostname(host)) {
    return resolveGrowvisiApiV1Url(host);
  }

  const fromEnv = sanitizeEnvUrl(process.env.NEXT_PUBLIC_API_URL, GROWVISI_API_V1_URL);
  return fromEnv.endsWith("/api/v1") ? fromEnv : `${fromEnv}/api/v1`;
}

/** WebSocket origin for Socket.IO (local / dedicated host only on Vercel). */
export function resolveWsBaseUrl(hostname?: string | null): string {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : null);

  if (host && parseGrowvisiHostname(host)) {
    return resolveGrowvisiWsUrl(host);
  }

  return sanitizeEnvUrl(process.env.NEXT_PUBLIC_WS_URL, GROWVISI_WS_URL);
}

/** Whether the host is a known Growvisi production domain (.in or .com). */
export function isGrowvisiProductionHost(hostname: string | null | undefined): boolean {
  return parseGrowvisiHostname(hostname) !== null;
}

export function isLocalDevHost(hostname: string | null | undefined): boolean {
  return isLocalHost(hostname ?? "");
}
