"use client";

import Link from "next/link";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Logo } from "@/components/marketing/logo";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  badge,
  children,
  footer,
  showMobileHero = true,
  formVariant = "flat",
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showMobileHero?: boolean;
  /** flat = open modern form (default for all auth pages) */
  formVariant?: "card" | "flat";
}) {
  const { t } = useAuthI18n();
  const flat = formVariant === "flat";

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] xl:grid-cols-[minmax(0,1fr)_520px]">
      <AuthBrandPanel />

      <div className={cn("flex min-h-screen flex-col", flat ? "bg-[#fafbfc]" : "bg-background")}>
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end lg:px-10 lg:py-6">
          <Logo className="lg:hidden" />
          <Link
            href="/"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:ml-0"
          >
              {t("auth.backToHome")}
            </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-12 lg:pb-12">
          <div className={cn("mx-auto w-full", flat ? "max-w-[420px]" : "max-w-[400px]")}>
            {showMobileHero ? (
              <div className="auth-mobile-hero mb-6 lg:hidden">
                <p className="text-[15px] font-bold tracking-tight text-foreground">{t("auth.mobileWedge")}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{t("auth.mobileSubline")}</p>
              </div>
            ) : null}

            {badge ? (
              <span className="mb-4 inline-flex rounded-full border border-accent/20 bg-bento-mint px-3 py-1 text-xs font-semibold text-accent">
                {badge}
              </span>
            ) : null}

            <div className={cn("mb-8", flat && "mb-7")}>
              <h1
                className={cn(
                  "font-bold tracking-tight text-foreground",
                  flat ? "text-[1.75rem] leading-tight sm:text-[2rem]" : "text-2xl sm:text-3xl",
                )}
              >
                {title}
              </h1>
              <p className={cn("mt-2.5 leading-relaxed text-muted-foreground", flat ? "text-[15px]" : "text-sm")}>
                {description}
              </p>
            </div>

            <div className={cn(!flat && "auth-form-card")}>{children}</div>

            {footer}

            <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground/80">
              {t("auth.termsAgree")}{" "}
              <Link href="/terms" className="font-medium text-accent underline-offset-2 hover:underline">
                {t("auth.terms")}
              </Link>
              ,{" "}
              <Link href="/privacy" className="font-medium text-accent underline-offset-2 hover:underline">
                {t("auth.privacy")}
              </Link>
              , and{" "}
              <Link href="/data-deletion" className="font-medium text-accent underline-offset-2 hover:underline">
                {t("auth.dataDeletion")}
              </Link>{" "}
              {t("auth.termsSuffix")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
