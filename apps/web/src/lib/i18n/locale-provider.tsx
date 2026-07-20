"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { createTranslator, resolveLocale, type Locale } from "./messages";
import { useAuthStore } from "@/stores/auth-store";

type I18nContextValue = {
  locale: Locale;
  t: (path: string) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Subscribe only to the locale field — avoids rerendering the whole dashboard
  // subtree on unrelated profile patches (name, avatar, onboarding, etc.).
  const userLocale = useAuthStore((s) => s.user?.locale);
  const locale = resolveLocale(userLocale);

  const setLocale = useCallback((_locale: Locale) => {
    // Profile PATCH handles persistence; optimistic update via auth store patch happens in settings UI.
  }, []);

  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const locale = resolveLocale(useAuthStore.getState().user?.locale);
    return { locale, t: createTranslator(locale), setLocale: () => {} };
  }
  return ctx;
}
