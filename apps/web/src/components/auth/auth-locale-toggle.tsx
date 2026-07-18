"use client";

import { cn } from "@/lib/utils";
import { useAuthI18n } from "./auth-i18n";

export function AuthLocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useAuthI18n();

  return (
    <div
      className={cn("inline-flex rounded-lg border border-border bg-white p-0.5 shadow-sm", className)}
      role="group"
      aria-label="Language"
    >
      {(["en", "hi"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setLocale(id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors",
            locale === id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {id === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
