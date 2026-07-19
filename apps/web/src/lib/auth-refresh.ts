import type { AuthSession } from "@/lib/auth-types";
import { logRefreshAttempt } from "@/lib/auth-observability";
import {
  clearRefreshCoordination,
  shareRefreshedSession,
  subscribePeerSessions,
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
import { hasSessionHint } from "@/lib/auth-cookie";
import {
  clearPersistedRefreshToken,
  persistRefreshToken,
  readPersistedRefreshToken,
} from "@/lib/refresh-token-persist";

export type { RefreshResult };

let refreshInFlight: Promise<RefreshResult> | null = null;
let peerSubAttached = false;

function applyPeerSession(accessToken: string, refreshToken: string) {
  useAuthStore.getState().patchAccessToken(accessToken, refreshToken || undefined);
  if (refreshToken) persistRefreshToken(refreshToken);
}

function ensurePeerSubscription() {
  if (peerSubAttached || typeof window === "undefined") return;
  peerSubAttached = true;
  subscribePeerSessions((session) => {
    applyPeerSession(session.accessToken, session.refreshToken);
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

type RefreshTransport = "cookie" | "body";

async function postRefresh(
  retryCount: number,
  transport: RefreshTransport,
  body?: string,
): Promise<RefreshResult> {
  const started = Date.now();
  try {
    const session = await rawFetchForAuth<AuthSession>("/auth/refresh", {
      method: "POST",
      body,
      // Body fallback must not send a stale HttpOnly cookie — server would prefer it
      // over the valid refreshToken in JSON (cookie ?? body). See auth.controller.ts.
      credentials: transport === "cookie" ? "include" : "omit",
    });
    useAuthStore.getState().setSession(session);
    persistRefreshToken(session.refreshToken);
    shareRefreshedSession(session.accessToken, session.refreshToken);
    return {
      kind: "SUCCESS",
      accessToken: session.accessToken,
      latencyMs: Date.now() - started,
      retryCount,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    return err instanceof ApiError
      ? classifyRefreshFailure(err.status, err.message, latencyMs, retryCount)
      : classifyRefreshFailure(0, "Refresh failed", latencyMs, retryCount);
  }
}

/**
 * HttpOnly cookie is primary (survives reload).
 * Zustand + sessionStorage are fallbacks when the cookie is missing or stale.
 */
function refreshTokenFallback(): string | null {
  const { refreshToken } = useAuthStore.getState();
  return refreshToken?.trim() || readPersistedRefreshToken();
}

async function performRefreshRequest(retryCount: number): Promise<RefreshResult> {
  const cookieFirst = await postRefresh(retryCount, "cookie");
  if (cookieFirst.kind === "SUCCESS") return cookieFirst;
  if (!isConclusiveAuthDeath(cookieFirst.kind)) return cookieFirst;

  const fallback = refreshTokenFallback();
  if (!fallback) return cookieFirst;

  const bodyResult = await postRefresh(
    retryCount + 1,
    "body",
    JSON.stringify({ refreshToken: fallback }),
  );
  if (bodyResult.kind === "SUCCESS") return bodyResult;

  if (isConclusiveAuthDeath(bodyResult.kind)) {
    clearPersistedRefreshToken();
  }
  return bodyResult;
}

/**
 * Classified refresh. Never clears the session on network/server failures.
 * Only AUTH_* results should be used by callers to end the session.
 */
export async function refreshSession(reason = "api_401"): Promise<RefreshResult> {
  ensurePeerSubscription();

  const { accessToken } = useAuthStore.getState();
  if (!accessToken && !hasSessionHint() && !readPersistedRefreshToken()) {
    return {
      kind: "AUTH_INVALID",
      message: "No session",
      latencyMs: 0,
      retryCount: 0,
    };
  }

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
        if (locked.peerSession) {
          applyPeerSession(locked.peerSession.accessToken, locked.peerSession.refreshToken);
          const result: RefreshResult = {
            kind: "SUCCESS",
            accessToken: locked.peerSession.accessToken,
            latencyMs: 0,
            retryCount,
          };
          logRefreshAttempt({ reason: `${reason}_peer`, result });
          return result;
        }
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
  if (!isConclusiveAuthDeath(result.kind)) return null;
  endSessionFromRefresh(result);
  return null;
}

/** Proactive / wake / bootstrap — refresh if access JWT is near expiry or missing. */
export async function ensureFreshAccessToken(reason: string): Promise<RefreshResult> {
  return refreshSession(reason);
}
