"use client";

import { createContext, useContext, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";
import {
  seedDashboardShellCache,
  type ShellBootstrapResponse,
} from "@/lib/shell-bootstrap";

const ShellBootstrapInitialContext = createContext<ShellBootstrapResponse | null>(null);

export function ShellBootstrapInitialProvider({
  initial,
  children,
}: {
  initial: ShellBootstrapResponse | null;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const seededKeyRef = useRef<string | null>(null);

  // Seed before child queries read cache — useEffect was too late (false "not connected" flash).
  if (initial) {
    const key = initial.me.user.id;
    if (seededKeyRef.current !== key) {
      seedDashboardShellCache(queryClient, initial);
      queryClient.setQueryData(QUERY_KEYS.shellBootstrap, initial);
      seededKeyRef.current = key;
    }
  }

  return (
    <ShellBootstrapInitialContext.Provider value={initial}>
      {children}
    </ShellBootstrapInitialContext.Provider>
  );
}

export function useShellBootstrapInitial(): ShellBootstrapResponse | null {
  return useContext(ShellBootstrapInitialContext);
}
