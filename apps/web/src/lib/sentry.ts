/** Optional Sentry — no-op when DSN unset or package missing. */
export function initSentryClient(): void {
  if (typeof window === "undefined") return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  } catch {
    console.warn("NEXT_PUBLIC_SENTRY_DSN is set but @sentry/nextjs is not installed.");
  }
}
