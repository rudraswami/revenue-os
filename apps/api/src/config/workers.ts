/** Use BullMQ when Redis is reachable — even on Vercel with Upstash/etc. */
export function useBackgroundWorkers(): boolean {
  if (process.env.USE_INLINE_WORKERS === "1") return false;
  if (process.env.USE_INLINE_WORKERS === "0") return true;
  const redis = process.env.REDIS_URL?.trim();
  if (redis) return true;
  return process.env.VERCEL !== "1";
}
