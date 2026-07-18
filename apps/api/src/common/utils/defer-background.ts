/**
 * Continue work after the HTTP response on Vercel (waitUntil).
 * On long-running hosts, runs as a detached promise.
 */
export function deferBackgroundTask(task: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await task();
    } catch (err) {
      console.error(
        "[deferBackgroundTask]",
        err instanceof Error ? err.message : err,
      );
    }
  };

  if (process.env.VERCEL === "1") {
    try {
      const { waitUntil } = require("@vercel/functions") as {
        waitUntil: (promise: Promise<unknown>) => void;
      };
      waitUntil(run());
      return;
    } catch {
      // Package missing — fall through to fire-and-forget
    }
  }

  void run();
}
