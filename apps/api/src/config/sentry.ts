export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node");
    if (Sentry.getClient?.()) return;
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  } catch (err) {
    console.warn("SENTRY_DSN is set but @sentry/node failed to initialize:", err);
  }
}
