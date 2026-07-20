"use client";

import { useEffect, useRef } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { reportDashboardInteractive } from "@/lib/rum";
import { startInteraction } from "@/lib/performance";
import { QUERY_KEYS } from "@/lib/query-config";
import { useShellBootstrapInitial } from "@/components/dashboard/shell-bootstrap-initial";
import { useAuthStore } from "@/stores/auth-store";

/** Time until shell bootstrap data is ready (RSC seed or client fetch) — §8.1 SLO. */
export function useDashboardInteractivePerf() {
  const started = useRef(startInteraction());
  const reported = useRef(false);
  const initialShell = useShellBootstrapInitial();
  const hydrated = useAuthStore((s) => s.hydrated);
  const queryClient = useQueryClient();
  const shellFetching = useIsFetching({ queryKey: QUERY_KEYS.shellBootstrap });

  useEffect(() => {
    if (reported.current) return;
    if (!hydrated) return;

    const hasShell =
      initialShell != null || queryClient.getQueryData(QUERY_KEYS.shellBootstrap) != null;
    if (!hasShell && shellFetching > 0) return;

    reported.current = true;
    reportDashboardInteractive(Math.round(performance.now() - started.current));
  }, [hydrated, initialShell, shellFetching, queryClient]);
}
