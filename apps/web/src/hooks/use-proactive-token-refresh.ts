"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/auth-refresh";
import { isConclusiveAuthDeath } from "@/lib/auth-session-death";
import { jwtExpiresInSec } from "@/lib/jwt-expiry";
import {
  accessTokenIsExpired,
  accessTokenNeedsRefresh,
  REFRESH_BEFORE_SEC,
} from "@/lib/session-continuity";
import { useAuthStore } from "@/stores/auth-store";
import { hasSessionHint } from "@/lib/auth-cookie";

const MIN_POLL_MS = 30_000;
/** Visible-tab safety net when setTimeout is throttled in background. */
const VISIBLE_INTERVAL_MS = 60_000;

export function useProactiveTokenRefresh() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken && !hasSessionHint()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const maybeRefresh = async (reason: string) => {
      if (cancelled) return;
      const token = useAuthStore.getState().accessToken;
      const shouldRefresh =
        !token || accessTokenIsExpired(token) || accessTokenNeedsRefresh(token);
      if (!shouldRefresh && !hasSessionHint()) return;
      if (!shouldRefresh) return;

      const result = await refreshSession(reason);
      if (cancelled) return;
      if (!isConclusiveAuthDeath(result.kind)) {
        schedule();
      }
    };

    const schedule = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);

      const token = useAuthStore.getState().accessToken;
      if (!token && !hasSessionHint()) return;

      if (!token || accessTokenIsExpired(token) || accessTokenNeedsRefresh(token)) {
        void maybeRefresh("proactive_expiry");
        return;
      }

      const expiresIn = jwtExpiresInSec(token);
      if (expiresIn == null) {
        timer = setTimeout(schedule, 5 * 60_000);
        return;
      }

      const delayMs = Math.max((expiresIn - REFRESH_BEFORE_SEC) * 1000, MIN_POLL_MS);
      timer = setTimeout(() => void maybeRefresh("proactive_timer"), delayMs);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void maybeRefresh("visibility_wake");
    };

    const onOnline = () => {
      void maybeRefresh("browser_online");
    };

    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) void maybeRefresh("bfcache_restore");
    };

    schedule();

    interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void maybeRefresh("visible_interval");
    }, VISIBLE_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onVisible);
    };
  }, [hydrated, accessToken]);
}
