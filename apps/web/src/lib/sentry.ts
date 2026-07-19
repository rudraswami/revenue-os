import * as Sentry from "@sentry/browser";

let initialized = false;

/** Client-side Sentry — enabled when NEXT_PUBLIC_SENTRY_DSN is set. */
export function initSentryClient(): void {
  if (typeof window === "undefined" || initialized) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureSentryClientException(error: unknown): void {
  if (!initialized) return;
  Sentry.captureException(error);
}
