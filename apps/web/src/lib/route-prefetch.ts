import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS, STALE } from "@/lib/query-config";

const prefetchedRoutes = new Set<string>();

/** Prefetch route-critical React Query data on sidebar hover/focus (P1). */
export function prefetchDashboardRoute(
  queryClient: QueryClient,
  href: string,
  token: string | null | undefined,
): void {
  if (!token) return;

  const path = href.split("?")[0];
  if (prefetchedRoutes.has(path)) return;
  prefetchedRoutes.add(path);

  const opts = { token };

  if (path === "/dashboard/inbox") {
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: [...QUERY_KEYS.conversationsList, "", "all", "active"],
        queryFn: () =>
          apiFetch<{ data: unknown[] }>("/conversations?pageSize=50", opts),
        staleTime: STALE.live,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.conversationQueueStats,
        queryFn: () =>
          apiFetch("/conversations/stats?scope=queue", opts),
        staleTime: STALE.live,
      }),
    ]);
    return;
  }

  if (path === "/dashboard/pipeline") {
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.pipeline("all", 40),
        queryFn: () => apiFetch("/leads/pipeline?perStageLimit=40", opts),
        staleTime: STALE.dashboard,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.pipelineSummary,
        queryFn: () => apiFetch("/leads/pipeline/summary", opts),
        staleTime: STALE.dashboard,
      }),
    ]);
    return;
  }

  if (path === "/dashboard/contacts") {
    void queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.contacts("", undefined, undefined, undefined, 1),
      queryFn: () => apiFetch("/leads/contacts?page=1&pageSize=50", opts),
      staleTime: STALE.dashboard,
    });
    return;
  }

  if (path === "/dashboard/analytics") {
    const period = "30d";
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.funnel(period),
        queryFn: () => apiFetch(`/leads/metrics/funnel?period=${period}`, opts),
        staleTime: STALE.metrics,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.conversationStats(period),
        queryFn: () => apiFetch(`/conversations/stats?period=${period}`, opts),
        staleTime: STALE.metrics,
      }),
    ]);
  }
}

/** Test helper — reset dedupe guard between tests. */
export function resetRoutePrefetchGuard(): void {
  prefetchedRoutes.clear();
}
