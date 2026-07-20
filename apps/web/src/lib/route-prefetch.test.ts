import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";
import { prefetchDashboardRoute, resetRoutePrefetchGuard } from "./route-prefetch";

describe("prefetchDashboardRoute", () => {
  let queryClient: QueryClient;
  let prefetchCalls: unknown[][];

  beforeEach(() => {
    resetRoutePrefetchGuard();
    prefetchCalls = [];
    queryClient = new QueryClient();
    const original = queryClient.prefetchQuery.bind(queryClient);
    queryClient.prefetchQuery = ((options: unknown) => {
      prefetchCalls.push([options]);
      return Promise.resolve(undefined);
    }) as typeof queryClient.prefetchQuery;
    void original;
  });

  it("prefetches inbox list and queue stats once per route", () => {
    prefetchDashboardRoute(queryClient, "/dashboard/inbox", "token");
    prefetchDashboardRoute(queryClient, "/dashboard/inbox", "token");

    assert.equal(prefetchCalls.length, 2);
    const first = prefetchCalls[0]?.[0] as { queryKey: unknown };
    assert.deepEqual(first.queryKey, [...QUERY_KEYS.conversationsList, "", "all", "active"]);
  });

  it("prefetches pipeline board data", () => {
    prefetchDashboardRoute(queryClient, "/dashboard/pipeline", "token");

    const keys = prefetchCalls.map((c) => (c[0] as { queryKey: unknown }).queryKey);
    assert.ok(keys.some((k) => JSON.stringify(k) === JSON.stringify(QUERY_KEYS.pipeline("all", 40))));
  });

  it("no-ops without token", () => {
    prefetchDashboardRoute(queryClient, "/dashboard/inbox", null);
    assert.equal(prefetchCalls.length, 0);
  });
});
