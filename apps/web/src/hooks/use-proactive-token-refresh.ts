"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/auth-refresh";
import { isConclusiveAuthDeath } from "@/lib/auth-session-death";
import { jwtExpiresInSec } from "@/lib/jwt-expiry";
import { useAuthStore } from "@/stores/auth-store";

/** Refresh access JWT ~2 minutes before expiry so API calls never hit a dead token. */
const REFRESH_BEFORE_SEC = 120;
const MIN_POLL_MS = 30_000;

export function useProactiveTokenRefresh() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const token = useAuthStore.getState().accessToken;
      if (!token) return;

      const expiresIn = jwtExpiresInSec(token);
      if (expiresIn == null) {
        timer = setTimeout(schedule, 5 * 60_000);
        return;
      }

      if (expiresIn <= REFRESH_BEFORE_SEC) {
        void refreshSession("proactive_expiry").then((result) => {
          if (isConclusiveAuthDeath(result.kind)) return;
          schedule();
        });
        return;
      }

      const delayMs = Math.max((expiresIn - REFRESH_BEFORE_SEC) * 1000, MIN_POLL_MS);
      timer = setTimeout(schedule, delayMs);
    };

    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [hydrated, accessToken]);
}
