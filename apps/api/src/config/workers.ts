/**
 * BullMQ processor registration — see docs/architecture/04-performance-engineering-standards.md §5.4
 *
 * Vercel API: enqueue only (processors off). Dedicated worker host: WORKER_ONLY=1.
 */
export type ProcessRole = "api" | "worker";

export function getProcessRole(): ProcessRole {
  return process.env.WORKER_ONLY === "1" ? "worker" : "api";
}

export function useBackgroundWorkers(): boolean {
  if (process.env.WORKER_ONLY === "1") return true;
  if (process.env.VERCEL === "1") return false;
  if (process.env.USE_INLINE_WORKERS === "1") return false;
  if (process.env.USE_INLINE_WORKERS === "0") return true;
  return Boolean(process.env.REDIS_URL?.trim());
}

export type QueueMode =
  | "background-workers"
  | "vercel-queue+waitUntil"
  | "inline+queue"
  | "inline-only";

export function getQueueMode(): QueueMode {
  if (useBackgroundWorkers()) return "background-workers";
  if (process.env.VERCEL === "1") return "vercel-queue+waitUntil";
  if (process.env.REDIS_URL?.trim()) return "inline+queue";
  return "inline-only";
}
