import type { Response } from "express";

/** §4.7 — authenticated CRM responses must not be stored by shared caches. */
export function setPrivateNoStore(res: Response): void {
  res.setHeader("Cache-Control", "private, no-store");
}

/** Health probes — revalidate each request. */
export function setHealthCacheControl(res: Response): void {
  res.setHeader("Cache-Control", "no-cache");
}

/** Redis-backed GET — observability for staging cert (not browser caching). */
export function setRedisCacheStatus(res: Response, hit: boolean): void {
  res.setHeader("X-Growvisi-Cache", hit ? "redis-hit" : "redis-miss");
  setPrivateNoStore(res);
}

export type CachedResponse<T> = {
  value: T;
  redisHit: boolean;
};
