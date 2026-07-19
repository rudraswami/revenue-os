import { jwtExpiresInSec } from "@/lib/jwt-expiry";

/** Refresh when access JWT is within this many seconds of expiry (covers throttled background tabs). */
export const REFRESH_BEFORE_SEC = 300;

/** Treat access JWT as stale — refresh before API calls. */
export const ACCESS_STALE_SEC = 60;

export function accessTokenNeedsRefresh(accessToken: string | null | undefined): boolean {
  if (!accessToken) return false;
  const expiresIn = jwtExpiresInSec(accessToken);
  if (expiresIn == null) return false;
  return expiresIn <= REFRESH_BEFORE_SEC;
}

export function accessTokenIsExpired(accessToken: string | null | undefined): boolean {
  if (!accessToken) return true;
  const expiresIn = jwtExpiresInSec(accessToken);
  if (expiresIn == null) return false;
  return expiresIn <= ACCESS_STALE_SEC;
}
