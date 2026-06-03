const COOKIE_NAME = "growthsync-session";

export function syncAuthCookie(active: boolean) {
  if (typeof document === "undefined") return;

  if (active) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}
