"use client";

import { QueryClient, keepPreviousData } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState } from "react";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { ProactiveTokenRefresh } from "@/components/auth/proactive-token-refresh";
import { SentryInit } from "@/components/auth/sentry-init";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { ToastProvider } from "@/components/ui/toast";
import { GC, STALE } from "@/lib/query-config";
import { setQueryClientRef } from "@/lib/query-client-ref";
import {
  createQueryPersister,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
} from "@/lib/query-persister";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE.dashboard,
            gcTime: GC.default,
            retry: 1,
            refetchOnWindowFocus: false,
            // Platform-wide stale-while-revalidate: keep the last successful
            // data on screen while a query with a changed key (filter, page,
            // period, id) refetches — no skeleton flash anywhere. Per-query
            // overrides still win. First loads (no prior data) still show
            // their skeleton.
            placeholderData: keepPreviousData,
          },
        },
      }),
  );

  const [persister] = useState(() => createQueryPersister());

  useEffect(() => {
    setQueryClientRef(client);
  }, [client]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          // Persist only settled, successful queries. Never persist errors or
          // in-flight state, and skip anything holding auth material.
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            !String(query.queryKey[0] ?? "").includes("auth-refresh"),
        },
      }}
    >
      <AuthBootstrap>
        <ProactiveTokenRefresh />
        <SentryInit />
        <ToastProvider>
          <RealtimeProvider>
            {children}
            <CookieConsent />
          </RealtimeProvider>
        </ToastProvider>
      </AuthBootstrap>
    </PersistQueryClientProvider>
  );
}
