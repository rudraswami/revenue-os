import { captureSentryClientException } from "@/lib/sentry";

const BUDGETS_MS: Record<string, number> = {
  "inbox.open_thread": 800,
  "inbox.send_message": 1200,
  "pipeline.move_stage": 600,
  "dashboard.shell_bootstrap": 2000,
  "dashboard.route_transition": 300,
};

export function measureInteraction(
  name: string,
  startMark: number,
  extra?: Record<string, string | number | boolean>,
): void {
  if (typeof performance === "undefined") return;
  const durationMs = Math.round(performance.now() - startMark);
  const budget = BUDGETS_MS[name];

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const over = budget != null && durationMs > budget ? " (over budget)" : "";
    console.debug(`[perf] ${name}: ${durationMs}ms${over}`, extra ?? "");
  }

  if (budget != null && durationMs > budget * 1.5) {
    captureSentryClientException(
      new Error(`Performance budget exceeded: ${name} took ${durationMs}ms (budget ${budget}ms)`),
    );
  }
}

export function startInteraction(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}
