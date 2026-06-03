"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap>
        <RealtimeProvider>{children}</RealtimeProvider>
      </AuthBootstrap>
    </QueryClientProvider>
  );
}
