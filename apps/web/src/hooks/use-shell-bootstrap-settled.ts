"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";

/**
 * Observe shell-bootstrap completion without triggering a fetch.
 * Dashboard/settings shells own the bootstrap queryFn.
 */
export function useShellBootstrapSettled(): boolean {
  const { status } = useQuery({
    queryKey: QUERY_KEYS.shellBootstrap,
    enabled: false,
  });
  return status === "success" || status === "error";
}
