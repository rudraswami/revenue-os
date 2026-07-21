import { getRequestContext } from "./context/request-context";

/** Best-effort Sentry capture — no-op when DSN unset or package missing. */
export function captureSentryException(exception: unknown): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const ctx = getRequestContext();

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node");
    Sentry.withScope((scope: {
      setTag: (key: string, value: string) => void;
      setUser: (user: { id: string }) => void;
    }) => {
      if (ctx?.requestId) scope.setTag("requestId", ctx.requestId);
      if (ctx?.organizationId) scope.setTag("organizationId", ctx.organizationId);
      if (ctx?.userId) scope.setUser({ id: ctx.userId });
      Sentry.captureException(exception);
    });
  } catch {
    // @sentry/node not installed — initSentry already warned at startup
  }
}
