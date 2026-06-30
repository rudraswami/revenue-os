"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { ToastProvider } from "@/components/ui/toast";
import { GC, STALE } from "@/lib/query-config";

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
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap>
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
