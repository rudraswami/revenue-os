/**
 * Plan a single refresh HTTP request so the API can fall from a stale HttpOnly
 * cookie to a valid body token without a visible 401 round-trip.
 */
export type RefreshRequestPlan =
  | { mode: "cookie_only" }
  | { mode: "body_only"; body: string }
  | { mode: "cookie_and_body"; body: string };

export function buildRefreshBody(refreshToken: string): string {
  return JSON.stringify({ refreshToken: refreshToken.trim() });
}

export function planRefreshRequest(
  fallbackRefreshToken: string | null,
  hasCookieHint: boolean,
): RefreshRequestPlan {
  const fallback = fallbackRefreshToken?.trim() || null;
  if (!fallback) return { mode: "cookie_only" };
  const body = buildRefreshBody(fallback);
  if (hasCookieHint) return { mode: "cookie_and_body", body };
  return { mode: "body_only", body };
}
