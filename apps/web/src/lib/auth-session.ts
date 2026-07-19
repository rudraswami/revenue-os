import { ApiError, apiFetch } from "@/lib/api-client";
import {
  endSessionFromRefresh,
  refreshAccessToken,
  refreshSession,
} from "@/lib/auth-refresh";
import { hasSessionHint, syncAuthCookie } from "@/lib/auth-cookie";
import type { AuthSession, AuthUser, MeResponse } from "@/lib/auth-types";
import { isConclusiveAuthDeath } from "@/lib/auth-session-death";
import { accessTokenIsExpired } from "@/lib/session-continuity";
import { useAuthStore } from "@/stores/auth-store";

export async function logout(): Promise<void> {
  const { refreshToken, clear } = useAuthStore.getState();
  try {
    // Always call the API (even without an in-memory token) so the server
    // revokes the session and clears the HttpOnly refresh cookie.
    await apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      skipAuthRetry: true,
    });
  } catch {
    // Still clear local session if API unreachable — user explicitly signed out
  }
  clear("USER_SIGN_OUT");
  syncAuthCookie(false);
}

export function applySession(session: AuthSession) {
  useAuthStore.getState().setSession(session);
  syncAuthCookie(true);
}

export function postAuthPath(onboarding?: { whatsappConnected?: boolean } | null): string {
  if (onboarding && onboarding.whatsappConnected === false) {
    return "/onboarding";
  }
  return "/dashboard";
}

/** After login/register — unverified users land on check-email first. */
export function postAuthRedirect(session: AuthSession, isInvite = false): string {
  if (!isInvite && !session.user.emailVerified) {
    return "/verify-email/check";
  }
  return postAuthPath(session.onboarding);
}

export function isEmailVerified(user: AuthUser | null | undefined): boolean {
  return !!user?.emailVerified;
}

/** Patch user/org profile into the store without wiping the refresh token. */
export function applyMeResponse(me: MeResponse) {
  const current = useAuthStore.getState();
  if (!current.accessToken) return;
  if (current.role && current.role !== me.role) {
    useAuthStore.getState().setRoleChangeNotice(current.role, me.role);
  }
  useAuthStore.getState().setSession({
    accessToken: current.accessToken,
    refreshToken: current.refreshToken ?? "",
    user: me.user,
    organization: me.organization,
    role: me.role,
    onboarding: me.onboarding,
  });
  syncAuthCookie(true);
}

/** Refresh profile from /auth/me — e.g. after verify in another tab. */
export async function syncProfileFromServer(): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  try {
    const me = await apiFetch<MeResponse>("/auth/me", { token });
    applyMeResponse(me);
  } catch {
    // Non-fatal — banner may be stale until next bootstrap
  }
}

async function fetchMe(token: string): Promise<"ok" | "auth_dead" | "transient"> {
  try {
    const me = await apiFetch<MeResponse>("/auth/me", { token, skipAuthRetry: true });
    applyMeResponse(me);
    return "ok";
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403) return "auth_dead";
      if (err.status === 0 || err.status >= 500 || err.status === 429) return "transient";
    }
    return "transient";
  }
}

/**
 * Restore session on app load.
 * Never clears auth on network/server failures — only on conclusive AUTH_*.
 */
let bootstrapInFlight: Promise<void> | null = null;

/** Idempotent — safe to call from bootstrap, guards, and focus handlers. */
export function startBootstrapAuth(): Promise<void> {
  if (!bootstrapInFlight) {
    bootstrapInFlight = bootstrapAuth().finally(() => {
      bootstrapInFlight = null;
    });
  }
  return bootstrapInFlight;
}

export async function bootstrapAuth(): Promise<void> {
  const state = useAuthStore.getState();
  if (!state.refreshToken && !state.accessToken && !hasSessionHint()) {
    return;
  }

  let token = state.accessToken;

  if (token && accessTokenIsExpired(token)) {
    const refreshed = await refreshSession("bootstrap_expired_access");
    if (refreshed.kind === "SUCCESS") {
      token = refreshed.accessToken;
    } else if (isConclusiveAuthDeath(refreshed.kind)) {
      endSessionFromRefresh(refreshed);
      return;
    } else {
      useAuthStore.getState().setTransientFailure(
        refreshed.kind === "NETWORK_FAILURE" ? "NETWORK_FAILURE" : "SERVER_FAILURE",
      );
    }
  }

  if (!token) {
    const refreshed = await refreshSession("bootstrap_no_access");
    if (refreshed.kind === "SUCCESS") {
      token = refreshed.accessToken;
    } else if (isConclusiveAuthDeath(refreshed.kind)) {
      endSessionFromRefresh(refreshed);
      return;
    } else {
      // NETWORK/SERVER — keep hint; AuthGuard will show reconnecting if no token
      useAuthStore.getState().setTransientFailure(
        refreshed.kind === "NETWORK_FAILURE" ? "NETWORK_FAILURE" : "SERVER_FAILURE",
      );
      return;
    }
  }

  let meResult = await fetchMe(token);
  if (meResult === "ok") return;

  if (meResult === "transient") {
    // Retry once after short delay
    await new Promise((r) => setTimeout(r, 800));
    meResult = await fetchMe(token);
    if (meResult === "ok") return;
    if (meResult === "transient") {
      useAuthStore.getState().setTransientFailure("SERVER_FAILURE");
      // Keep accessToken so AuthGuard does not bounce to login
      return;
    }
  }

  // auth_dead on /auth/me — try refresh
  const refreshed = await refreshSession("bootstrap_me_401");
  if (refreshed.kind === "SUCCESS") {
    const again = await fetchMe(refreshed.accessToken);
    if (again === "ok") return;
    if (again === "transient") {
      useAuthStore.getState().setTransientFailure("SERVER_FAILURE");
      return;
    }
    // Still auth dead after fresh token — conclusive
    useAuthStore.getState().clear("BOOTSTRAP_AUTH_INVALID");
    return;
  }

  if (isConclusiveAuthDeath(refreshed.kind)) {
    endSessionFromRefresh(refreshed);
    return;
  }

  // Transient refresh failure — keep whatever access token we had
  useAuthStore.getState().setTransientFailure(
    refreshed.kind === "NETWORK_FAILURE" ? "NETWORK_FAILURE" : "SERVER_FAILURE",
  );
}

/** @deprecated use refreshAccessToken from api-client / auth-refresh */
export { refreshAccessToken };
