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

/** Patch user/org profile into the store without wiping the refresh token. */
function patchProfile(me: MeResponse) {
  const current = useAuthStore.getState();
  useAuthStore.getState().setSession({
    accessToken: current.accessToken!,
    refreshToken: current.refreshToken ?? "",
    user: me.user,
    organization: me.organization,
    role: me.role,
    onboarding: me.onboarding,
  });
  syncAuthCookie(true);
}

/** Restore session on app load: refresh tokens + sync profile from API. */
export async function bootstrapAuth(): Promise<void> {
  const state = useAuthStore.getState();
  if (!state.refreshToken && !state.accessToken && !hasSessionHint()) {
    return;
  }

  let token = state.accessToken;

  if (!token) {
    token = await refreshAccessToken();
    if (!token) {
      useAuthStore.getState().clear();
      syncAuthCookie(false);
      return;
    }
  }

  try {
    const me = await apiFetch<MeResponse>("/auth/me", { token });
    patchProfile(me);
  } catch {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      useAuthStore.getState().clear();
      syncAuthCookie(false);
      return;
    }

    try {
      const me = await apiFetch<MeResponse>("/auth/me");
      patchProfile(me);
    } catch {
      useAuthStore.getState().clear();
      syncAuthCookie(false);
    }
  }
}
