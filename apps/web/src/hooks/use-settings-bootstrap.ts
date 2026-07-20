"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { seedDashboardShellCache, type ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import { useAuthStore } from "@/stores/auth-store";
import { useShellBootstrapInitial } from "@/components/dashboard/shell-bootstrap-initial";

/**
 * Seeds React Query caches for Settings (billing, WhatsApp, team limits context)
 * using the same BFF as the dashboard shell — one round-trip, no shell-blocking waterfall.
 */
export function useSettingsBootstrap() {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.accessToken);
  const initialShell = useShellBootstrapInitial();

  return useQuery({
    queryKey: QUERY_KEYS.shellBootstrap,
    queryFn: async () => {
      const data = await apiFetch<ShellBootstrapResponse>("/organizations/shell-bootstrap", {
        token: token ?? undefined,
      });
      seedDashboardShellCache(queryClient, data);
      return data;
    },
    enabled: hydrated && !!token,
    initialData: initialShell ?? undefined,
    staleTime: STALE.config,
    refetchOnWindowFocus: false,
    placeholderData: () =>
      queryClient.getQueryData<ShellBootstrapResponse>(QUERY_KEYS.shellBootstrap),
  });
}
