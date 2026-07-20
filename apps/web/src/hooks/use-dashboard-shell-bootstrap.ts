"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { measureInteraction, startInteraction } from "@/lib/performance";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { seedDashboardShellCache, type ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import { useAuthStore } from "@/stores/auth-store";
import { useShellBootstrapInitial } from "@/components/dashboard/shell-bootstrap-initial";

/**
 * One request for dashboard shell state — seeds caches for sidebar, banners, setup FAB.
 * Queue stats stay on their own polled query (live inbox badge).
 */
export function useDashboardShellBootstrap() {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.accessToken);
  const initialShell = useShellBootstrapInitial();

  const query = useQuery({
    queryKey: QUERY_KEYS.shellBootstrap,
    queryFn: async () => {
      const started = startInteraction();
      const data = await apiFetch<ShellBootstrapResponse>("/organizations/shell-bootstrap", {
        token: token ?? undefined,
      });
      seedDashboardShellCache(queryClient, data);
      measureInteraction("dashboard.shell_bootstrap", started);
      return data;
    },
    enabled: hydrated && !!token,
    initialData: initialShell ?? undefined,
    staleTime: STALE.config,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount >= 2) return false;
      const status = (error as { status?: number })?.status;
      return status === 401 || status === 0 || (status != null && status >= 500);
    },
  });

  // After proactive refresh replaces an expired JWT, recover from a failed bootstrap refetch.
  const lastRecoveryTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!token || !query.isError) return;
    if (lastRecoveryTokenRef.current === token) return;
    lastRecoveryTokenRef.current = token;
    void query.refetch();
  }, [token, query.isError, query.refetch]);

  return query;
}
