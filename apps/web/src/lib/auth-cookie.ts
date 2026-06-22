const COOKIE_NAME = "growvisi-session";

/** Client-readable hint that a session may exist (real auth is the HttpOnly cookie). */
export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${COOKIE_NAME}=1`);
}

export function syncAuthCookie(active: boolean) {
  if (typeof document === "undefined") return;

  if (active) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}
