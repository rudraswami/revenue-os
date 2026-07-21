/**
 * Theme model for the authenticated app. Dark mode is scoped to app routes so
 * the marketing/auth surfaces stay light regardless of the stored preference.
 */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "growvisi-theme";

/** Route prefixes that participate in theming. */
export function isAppRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // storage blocked — fall back to system
  }
  return "system";
}

/**
 * Inline, self-contained script that runs before first paint to prevent a
 * light-to-dark flash when loading directly into an app route. Kept as a string
 * so it can be injected via dangerouslySetInnerHTML in the root layout.
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var path=location.pathname;var app=path.indexOf('/dashboard')===0||path.indexOf('/onboarding')===0;var dark=p==='dark'||(p==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(app&&dark){document.documentElement.classList.add('dark');}}catch(e){}})();`;
