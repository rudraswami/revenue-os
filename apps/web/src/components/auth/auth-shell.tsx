"use client";

import Link from "next/link";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { Logo } from "@/components/marketing/logo";

export function AuthShell({
  title,
  description,
  badge,
  children,
  footer,
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] xl:grid-cols-[minmax(0,1fr)_520px]">
      <AuthBrandPanel />

      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Logo />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-12 lg:py-12">
          <div className="mx-auto w-full max-w-[400px]">
            {badge && (
              <span className="mb-4 inline-flex rounded-full border border-accent/20 bg-bento-mint px-3 py-1 text-xs font-semibold text-accent">
                {badge}
              </span>
            )}

            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <div className="auth-form-card">{children}</div>

            {footer}

            <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
              By continuing you agree to our{" "}
              <Link href="/terms" className="font-medium text-accent underline-offset-2 hover:underline">
                Terms
              </Link>
              ,{" "}
              <Link href="/privacy" className="font-medium text-accent underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                href="/data-deletion"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Data deletion
              </Link>{" "}
              instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
