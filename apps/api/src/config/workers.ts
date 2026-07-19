/**
 * Use BullMQ background processors only on long-running hosts (not Vercel serverless).
 * On Vercel, jobs are enqueued to Redis when REDIS_URL is set, then processed inline
 * via waitUntil in the same invocation — queue workers never stay alive.
 */
export function useBackgroundWorkers(): boolean {
  if (process.env.USE_INLINE_WORKERS === "1") return false;
  if (process.env.USE_INLINE_WORKERS === "0") return true;
  if (process.env.VERCEL === "1") return false;
  return Boolean(process.env.REDIS_URL?.trim());
}
