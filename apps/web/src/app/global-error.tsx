"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GrowvisiLogoMark } from "@/components/ui/loading";

/**
 * Root error boundary — auth, marketing, and any route outside dashboard/error.tsx.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <GrowvisiLogoMark size={40} className="mb-5 opacity-90" />
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Growvisi hit an unexpected error. Your workspace data is safe — try again or return
            home.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
            >
              Go to home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
