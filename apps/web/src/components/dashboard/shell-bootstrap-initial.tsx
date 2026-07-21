"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";
import {
  seedDashboardShellCache,
  type ShellBootstrapResponse,
} from "@/lib/shell-bootstrap";

const ShellBootstrapInitialContext = createContext<ShellBootstrapResponse | null>(null);

/**
 * Consumes the streamed server shell-bootstrap promise WITHOUT blocking the app
 * shell. The chrome renders immediately (returning users hydrate from the
 * persisted React Query cache); when the server seed resolves it fills/refreshes
 * the cache so the sidebar, banners and setup FAB reconcile to server truth.
 */
export function ShellBootstrapInitialProvider({
  initialPromise,
  children,
}: {
  initialPromise: Promise<ShellBootstrapResponse | null>;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [initial, setInitial] = useState<ShellBootstrapResponse | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve(initialPromise)
      .then((res) => {
        if (!active || !res) return;
        seedDashboardShellCache(queryClient, res);
        queryClient.setQueryData(QUERY_KEYS.shellBootstrap, res);
        setInitial(res);
      })
      .catch(() => {
        // Non-blocking optimization — client bootstrap + cache take over.
      });
    return () => {
      active = false;
    };
  }, [initialPromise, queryClient]);

  return (
    <ShellBootstrapInitialContext.Provider value={initial}>
      {children}
    </ShellBootstrapInitialContext.Provider>
  );
}

export function useShellBootstrapInitial(): ShellBootstrapResponse | null {
  return useContext(ShellBootstrapInitialContext);
}
