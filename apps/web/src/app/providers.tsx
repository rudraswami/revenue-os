"use client";

import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { ProactiveTokenRefresh } from "@/components/auth/proactive-token-refresh";
import { SentryInit } from "@/components/auth/sentry-init";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { ToastProvider } from "@/components/ui/toast";
import { GC, STALE } from "@/lib/query-config";
import { setQueryClientRef } from "@/lib/query-client-ref";

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

  useEffect(() => {
    setQueryClientRef(client);
  }, [client]);

  return (
    <QueryClientProvider client={client}>
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
    </QueryClientProvider>
  );
}
