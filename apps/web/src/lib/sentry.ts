/**
 * Client Sentry bootstrap placeholder.
 * To enable: add @sentry/nextjs, set NEXT_PUBLIC_SENTRY_DSN, and follow Sentry Next.js setup.
 */
export function initSentryClient(): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) return;
  // No-op until @sentry/nextjs is added to apps/web dependencies.
}
