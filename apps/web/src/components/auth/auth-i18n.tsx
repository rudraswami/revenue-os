"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, resolveLocale, type Locale } from "@/lib/i18n/messages";

const GUEST_LOCALE_KEY = "growvisi-guest-locale";
const MARKETING_LOCALE_KEY = "growvisi-marketing-locale";

type AuthI18nValue = {
  locale: Locale;
  t: (path: string) => string;
  setLocale: (locale: Locale) => void;
};

const AuthI18nContext = createContext<AuthI18nValue | null>(null);

function readGuestLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(GUEST_LOCALE_KEY) ?? localStorage.getItem(MARKETING_LOCALE_KEY);
    return resolveLocale(saved);
  } catch {
    return "en";
  }
}

/** Guest locale for auth pages (persists EN/हिं before login). */
export function AuthI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readGuestLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(GUEST_LOCALE_KEY, next);
      localStorage.setItem(MARKETING_LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <AuthI18nContext.Provider value={value}>{children}</AuthI18nContext.Provider>;
}

export function useAuthI18n() {
  const ctx = useContext(AuthI18nContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      t: createTranslator("en"),
      setLocale: () => {},
    };
  }
  return ctx;
}
