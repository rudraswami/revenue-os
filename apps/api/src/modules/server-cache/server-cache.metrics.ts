export type ServerCacheMetrics = {
  hits: number;
  misses: number;
  sets: number;
  dels: number;
  errors: number;
  timeouts: number;
  invalidations: number;
  invalidationFailures: number;
};

export function createEmptyCacheMetrics(): ServerCacheMetrics {
  return {
    hits: 0,
    misses: 0,
    sets: 0,
    dels: 0,
    errors: 0,
    timeouts: 0,
    invalidations: 0,
    invalidationFailures: 0,
  };
}
