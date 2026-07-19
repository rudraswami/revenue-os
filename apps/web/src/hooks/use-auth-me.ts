"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { applyMeResponse } from "@/lib/auth-session";
import type { MeResponse } from "@/lib/auth-types";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Single React Query source for GET /auth/me.
 * Syncs profile/role/onboarding into Zustand; refetches on focus/reconnect only.
 */
export function useAuthMe(options?: { cacheOnly?: boolean }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.accessToken);
  const cacheOnly = options?.cacheOnly ?? false;

  const query = useQuery({
    queryKey: QUERY_KEYS.authMe,
    queryFn: () => apiFetch<MeResponse>("/auth/me", { token: token ?? undefined }),
    enabled: !cacheOnly && hydrated && !!token,
    staleTime: STALE.dashboard,
    refetchOnWindowFocus: !cacheOnly,
    refetchOnReconnect: !cacheOnly,
  });

  useEffect(() => {
    if (query.data) {
      applyMeResponse(query.data);
    }
  }, [query.data]);

  return query;
}
