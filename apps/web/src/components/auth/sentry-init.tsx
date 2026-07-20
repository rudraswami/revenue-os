"use client";

import { useEffect } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { initWebVitalsObservers, sampleQueryCacheStats } from "@/lib/rum";
import { initSentryClient } from "@/lib/sentry";

/** One-time client RUM + Sentry bootstrap (P2). */
export function SentryInit() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching();

  useEffect(() => {
    initSentryClient();
    initWebVitalsObservers();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const queries = queryClient.getQueryCache().getAll();
      sampleQueryCacheStats({ queries: queries.length, fetching });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [queryClient, fetching]);

  return null;
}
