import type { AuthSession } from "@/lib/auth-types";
import { logRefreshAttempt } from "@/lib/auth-observability";
import {
  clearRefreshCoordination,
  shareAccessToken,
  subscribePeerAccessTokens,
  withRefreshLock,
} from "@/lib/auth-refresh-lock";
import {
  classifyRefreshFailure,
  isConclusiveAuthDeath,
  logoutReasonFromRefresh,
  type RefreshResult,
} from "@/lib/auth-session-death";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, rawFetchForAuth } from "@/lib/api-client-core";

export type { RefreshResult };

let refreshInFlight: Promise<RefreshResult> | null = null;
let peerSubAttached = false;

function ensurePeerSubscription() {
  if (peerSubAttached || typeof window === "undefined") return;
  peerSubAttached = true;
  subscribePeerAccessTokens((accessToken) => {
    useAuthStore.getState().patchAccessToken(accessToken);
  });
}

async function waitForOnline(timeoutMs = 30_000): Promise<boolean> {
  if (typeof navigator === "undefined" || navigator.onLine) return true;
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.removeEventListener("online", onOnline);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onOnline = () => done(true);
    window.addEventListener("online", onOnline);
    const timer = window.setTimeout(() => done(false), timeoutMs);
  });
}

async function performRefreshRequest(
  retryCount: number,
  opts?: { cookieOnly?: boolean },
): Promise<RefreshResult> {
  const started = Date.now();
  const { refreshToken } = useAuthStore.getState();
  const useBodyToken = !opts?.cookieOnly && !!refreshToken;

  try {
    const session = await rawFetchForAuth<AuthSession>("/auth/refresh", {
      method: "POST",
      body: useBodyToken ? JSON.stringify({ refreshToken }) : undefined,
    });
    useAuthStore.getState().setSession(session);
    shareAccessToken(session.accessToken);
    return {
      kind: "SUCCESS",
      accessToken: session.accessToken,
      latencyMs: Date.now() - started,
      retryCount,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const classified =
      err instanceof ApiError
        ? classifyRefreshFailure(err.status, err.message, latencyMs, retryCount)
        : classifyRefreshFailure(0, "Refresh failed", latencyMs, retryCount);

    // Multi-tab race: another tab rotated the HttpOnly cookie while we still
    // had a stale refreshToken in memory — retry once with cookie only.
    if (
      useBodyToken &&
      !opts?.cookieOnly &&
      isConclusiveAuthDeath(classified.kind)
    ) {
      return performRefreshRequest(retryCount + 1, { cookieOnly: true });
    }
    return classified;
  }
}

/**
 * Classified refresh. Never clears the session on network/server failures.
 * Only AUTH_* results should be used by callers to end the session.
 */
export async function refreshSession(reason = "api_401"): Promise<RefreshResult> {
  ensurePeerSubscription();

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      let retryCount = 0;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cameBack = await waitForOnline();
        if (!cameBack) {
          const result: RefreshResult = {
            kind: "NETWORK_FAILURE",
            message: "Browser is offline",
            latencyMs: 0,
            retryCount: 0,
          };
          useAuthStore.getState().setTransientFailure("NETWORK_FAILURE");
          logRefreshAttempt({ reason, result });
          return result;
        }
        retryCount += 1;
      }

      const locked = await withRefreshLock(async () => performRefreshRequest(retryCount));

      if (!locked.ran) {
        if (locked.peerToken) {
          useAuthStore.getState().patchAccessToken(locked.peerToken);
          const result: RefreshResult = {
            kind: "SUCCESS",
            accessToken: locked.peerToken,
            latencyMs: 0,
            retryCount,
          };
          logRefreshAttempt({ reason: `${reason}_peer`, result });
          return result;
        }
        // Peer did not share — try once ourselves
        retryCount += 1;
        const own = await performRefreshRequest(retryCount);
        applyRefreshSideEffects(own);
        logRefreshAttempt({ reason: `${reason}_lock_timeout`, result: own });
        return own;
      }

      const result = locked.value!;
      applyRefreshSideEffects(result);
      logRefreshAttempt({ reason, result });
      return result;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

function applyRefreshSideEffects(result: RefreshResult) {
  if (result.kind === "SUCCESS") {
    useAuthStore.getState().setTransientFailure(null);
    return;
  }
  if (result.kind === "NETWORK_FAILURE" || result.kind === "SERVER_FAILURE") {
    useAuthStore.getState().setTransientFailure(result.kind);
    return;
  }
  // Conclusive auth death — clear only here when caller asks via endSessionFromRefresh
}

/** Apply conclusive auth death. No-op for transient failures. */
export function endSessionFromRefresh(result: RefreshResult): boolean {
  if (result.kind === "SUCCESS") return false;
  if (!isConclusiveAuthDeath(result.kind)) return false;
  useAuthStore.getState().clear(logoutReasonFromRefresh(result.kind));
  clearRefreshCoordination();
  return true;
}

/**
 * Convenience for apiFetch: returns new access token or null without clearing
 * on transient errors. Clears only on conclusive AUTH_*.
 */
export async function refreshAccessToken(reason = "api_401"): Promise<string | null> {
  const result = await refreshSession(reason);
  if (result.kind === "SUCCESS") return result.accessToken;
  endSessionFromRefresh(result);
  return null;
}
