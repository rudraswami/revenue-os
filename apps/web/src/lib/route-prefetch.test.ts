import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { inboxListQueryKey } from "./inbox-list-query";
import { prefetchDashboardRoute, resetRoutePrefetchGuard } from "./route-prefetch";

describe("prefetchDashboardRoute", () => {
  let queryClient: QueryClient;
  let prefetchCalls: unknown[][];
  let infinitePrefetchCalls: unknown[][];

  beforeEach(() => {
    resetRoutePrefetchGuard();
    prefetchCalls = [];
    infinitePrefetchCalls = [];
    queryClient = new QueryClient();
    const original = queryClient.prefetchQuery.bind(queryClient);
    queryClient.prefetchQuery = ((options: unknown) => {
      prefetchCalls.push([options]);
      return Promise.resolve(undefined);
    }) as typeof queryClient.prefetchQuery;
    const originalInfinite = queryClient.prefetchInfiniteQuery.bind(queryClient);
    queryClient.prefetchInfiniteQuery = ((options: unknown) => {
      infinitePrefetchCalls.push([options]);
      return Promise.resolve(undefined);
    }) as typeof queryClient.prefetchInfiniteQuery;
    void original;
    void originalInfinite;
  });

  it("prefetches inbox list and queue stats once per route", () => {
    prefetchDashboardRoute(queryClient, "/dashboard/inbox", "token");
    prefetchDashboardRoute(queryClient, "/dashboard/inbox", "token");

    assert.equal(infinitePrefetchCalls.length, 1);
    assert.equal(prefetchCalls.length, 1);
    const first = infinitePrefetchCalls[0]?.[0] as { queryKey: unknown };
    assert.deepEqual(first.queryKey, inboxListQueryKey("", "all", "active"));
  });

  it("prefetches pipeline board data", () => {
    prefetchDashboardRoute(queryClient, "/dashboard/pipeline", "token");

    const keys = prefetchCalls.map((c) => (c[0] as { queryKey: unknown }).queryKey);
    assert.ok(keys.some((k) => JSON.stringify(k).includes("pipeline")));
  });

  it("no-ops without token", () => {
    prefetchDashboardRoute(queryClient, "/dashboard/inbox", null);
    assert.equal(prefetchCalls.length, 0);
  });
});
