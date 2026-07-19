"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { measureInteraction, startInteraction } from "@/lib/performance";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { seedDashboardShellCache, type ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import { useAuthStore } from "@/stores/auth-store";

/**
 * One request for dashboard shell state — seeds caches for sidebar, banners, setup FAB.
 * Queue stats stay on their own polled query (live inbox badge).
 */
export function useDashboardShellBootstrap() {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.accessToken);

  return useQuery({
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
    staleTime: STALE.dashboard,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
