import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { seedInboxThreadBundleCache, type InboxThreadBundle } from "@/lib/inbox-thread-bundle";

const prefetched = new Set<string>();

/** Hover/focus prefetch — warm thread bundle before click (P0 inbox perf). */
export function prefetchInboxThread(
  queryClient: QueryClient,
  conversationId: string,
  token: string | null | undefined,
): void {
  if (!token || !conversationId) return;
  if (prefetched.has(conversationId)) return;

  const existing = queryClient.getQueryData(QUERY_KEYS.conversationThread(conversationId));
  if (existing) {
    prefetched.add(conversationId);
    return;
  }

  prefetched.add(conversationId);
  void queryClient
    .prefetchQuery({
      queryKey: QUERY_KEYS.conversationThread(conversationId),
      queryFn: async () => {
        const bundle = await apiFetch<InboxThreadBundle>(
          `/conversations/${conversationId}/thread`,
          { token },
        );
        seedInboxThreadBundleCache(queryClient, conversationId, bundle);
        return bundle;
      },
      staleTime: STALE.live,
    })
    .catch(() => {
      prefetched.delete(conversationId);
    });
}

export function resetInboxThreadPrefetchGuard(): void {
  prefetched.clear();
}
