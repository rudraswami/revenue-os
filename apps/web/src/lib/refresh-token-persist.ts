/**
 * Backup store for the refresh token when the HttpOnly cookie is unavailable
 * (browser privacy settings, cross-subdomain quirks, or first load after login).
 *
 * Primary auth credential remains the HttpOnly `growvisi_rt` cookie on the API host.
 * sessionStorage is a same-origin fallback only — cleared when the browser session ends.
 */

const KEY = "growvisi-refresh-token";

export function readPersistedRefreshToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function persistRefreshToken(token: string | null | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!token?.trim()) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, token.trim());
  } catch {
    // Private browsing quota — cookie path must still work
  }
}

export function clearPersistedRefreshToken(): void {
  persistRefreshToken(null);
}
