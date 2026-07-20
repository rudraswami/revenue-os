"use client";

import {
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";
import { useShellBootstrapSettled } from "@/hooks/use-shell-bootstrap-settled";

type ShellCachedQueryOptions<TData> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  staleTime?: number;
  /** Extra gate — defaults true */
  enabled?: boolean;
  /**
   * When true, fetch even if shell bootstrap has not settled (e.g. direct /settings deep link).
   * Default false — wait for bootstrap to seed cache first.
   */
  allowFetchBeforeBootstrap?: boolean;
  /** Background refresh after cache seed (e.g. ops strip, token health). */
  refetchInterval?: number | false;
};

/**
 * Cache-first query for data seeded by GET /organizations/shell-bootstrap.
 * Avoids duplicate network calls on dashboard mount (P0 shell contract).
 */
export function useShellCachedQuery<TData>({
  queryKey,
  queryFn,
  staleTime = STALE.dashboard,
  enabled = true,
  allowFetchBeforeBootstrap = false,
  refetchInterval,
}: ShellCachedQueryOptions<TData>): UseQueryResult<TData, Error> {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.accessToken);
  const bootstrapSettled = useShellBootstrapSettled();

  const cached = queryClient.getQueryData<TData>(queryKey);
  const bootstrapReady = bootstrapSettled || allowFetchBeforeBootstrap;
  const needsInitialFetch = cached === undefined;
  const wantsPolling = refetchInterval != null && refetchInterval !== false;

  const queryEnabled =
    hydrated &&
    !!token &&
    enabled &&
    bootstrapReady &&
    (needsInitialFetch || wantsPolling);

  return useQuery<TData, Error>({
    queryKey,
    queryFn,
    enabled: queryEnabled,
    staleTime,
    refetchInterval: wantsPolling ? refetchInterval : false,
    refetchOnWindowFocus: false,
  });
}

type ShellBillingQueryOptions = {
  enabled?: boolean;
  /** Settings / pricing — refetch when stale after bootstrap (still uses cache as placeholder). */
  preferFresh?: boolean;
  /** Onboarding / settings before dashboard shell mounts. */
  allowFetchBeforeBootstrap?: boolean;
};

/** Billing snapshot from shell bootstrap or GET /billing when cache empty. */
export function useShellBilling<T = Record<string, unknown>>(
  options?: ShellBillingQueryOptions,
): UseQueryResult<T, Error> {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.accessToken);
  const bootstrapSettled = useShellBootstrapSettled();
  const enabled = options?.enabled ?? true;
  const preferFresh = options?.preferFresh ?? false;

  const cachedQuery = useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.billing,
    queryFn: () => apiFetch<T>("/billing", { token: token ?? undefined }),
    staleTime: STALE.dashboard,
    enabled: enabled && !preferFresh,
    allowFetchBeforeBootstrap: options?.allowFetchBeforeBootstrap,
  });

  const freshQuery = useQuery<T, Error>({
    queryKey: QUERY_KEYS.billing,
    queryFn: () => apiFetch<T>("/billing", { token: token ?? undefined }),
    enabled: hydrated && !!token && enabled && preferFresh && bootstrapSettled,
    staleTime: STALE.config,
    refetchOnWindowFocus: false,
  });

  return preferFresh ? freshQuery : cachedQuery;
}
