import { apiFetch, refreshAccessToken } from "@/lib/api-client";
import { hasSessionHint, syncAuthCookie } from "@/lib/auth-cookie";
import type { AuthSession, MeResponse } from "@/lib/auth-types";
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
    // Still clear local session if API unreachable
  }
  clear();
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

/** Restore session on app load: refresh tokens + sync profile from API. */
export async function bootstrapAuth(): Promise<void> {
  const state = useAuthStore.getState();
  // The refresh token is no longer persisted to localStorage — after a reload it
  // lives only in the HttpOnly cookie. Attempt restore when we have a persisted
  // access token or the client-readable session hint cookie.
  if (!state.refreshToken && !state.accessToken && !hasSessionHint()) {
    return;
  }

  let token = state.accessToken;

  if (!token) {
    token = await refreshAccessToken();
    if (!token) return;
  }

  try {
    const me = await apiFetch<MeResponse>("/auth/me", { token });
    const current = useAuthStore.getState();
    useAuthStore.getState().setSession({
      accessToken: current.accessToken!,
      refreshToken: current.refreshToken!,
      user: me.user,
      organization: me.organization,
      onboarding: me.onboarding,
    });
    syncAuthCookie(true);
  } catch {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return;

    try {
      const me = await apiFetch<MeResponse>("/auth/me");
      const current = useAuthStore.getState();
      useAuthStore.getState().setSession({
        accessToken: current.accessToken!,
        refreshToken: current.refreshToken!,
        user: me.user,
        organization: me.organization,
        onboarding: me.onboarding,
      });
      syncAuthCookie(true);
    } catch {
      useAuthStore.getState().clear();
      syncAuthCookie(false);
    }
  }
}
