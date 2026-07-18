/** Best-effort Sentry capture — no-op when DSN unset or package missing. */
export function captureSentryException(exception: unknown): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node");
    Sentry.captureException(exception);
  } catch {
    // @sentry/node not installed — initSentry already warned at startup
  }
}
