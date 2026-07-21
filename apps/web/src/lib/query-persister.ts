import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { clear, del, get, set } from "idb-keyval";

/**
 * IndexedDB-backed React Query persistence.
 *
 * Why IndexedDB (not localStorage): the cache holds inbox lists, pipeline, and
 * metrics that can exceed the ~5 MB localStorage quota. IndexedDB is async and
 * large enough, so a hard refresh or a brand-new tab paints instantly from the
 * last snapshot while queries revalidate in the background.
 */

const CACHE_KEY = "growvisi-rq-cache";

/**
 * Cache schema/version buster. Bump this whenever the shape of persisted query
 * data changes so stale snapshots are discarded instead of hydrated.
 */
export const QUERY_CACHE_BUSTER = "v1";

/** Discard snapshots older than this (background revalidate still runs on mount). */
export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

const noopPersister: Persister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};

/**
 * Server render and non-browser contexts have no IndexedDB — return a no-op so
 * PersistQueryClientProvider stays happy without touching a missing global.
 */
export function createQueryPersister(): Persister {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return noopPersister;
  }

  return createAsyncStoragePersister({
    key: CACHE_KEY,
    throttleTime: 1000,
    storage: {
      getItem: (key) => get<string>(key).then((v) => v ?? null),
      setItem: (key, value) => set(key, value),
      removeItem: (key) => del(key),
    },
  });
}

/**
 * Hard-remove the persisted snapshot. Call on logout / auth death so the next
 * user on the same device cannot inherit the previous account's cached data.
 */
export async function removePersistedQueryCache(): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  try {
    await del(CACHE_KEY);
    // Legacy/orphaned entries safety net.
    await clear();
  } catch {
    // Best-effort — logout must never block on storage.
  }
}
