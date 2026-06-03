import { apiFetch, refreshAccessToken } from "@/lib/api-client";
import { syncAuthCookie } from "@/lib/auth-cookie";
import type { AuthSession, MeResponse } from "@/lib/auth-types";
import { useAuthStore } from "@/stores/auth-store";

export async function logout(): Promise<void> {
  const { refreshToken, clear } = useAuthStore.getState();
  if (refreshToken) {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        skipAuthRetry: true,
      });
    } catch {
      // Still clear local session if API unreachable
    }
  }
  clear();
  syncAuthCookie(false);
}

export function applySession(session: AuthSession) {
  useAuthStore.getState().setSession(session);
  syncAuthCookie(true);
}

export function postAuthPath(onboarding: { complete: boolean } | null | undefined): string {
  if (!onboarding?.complete) {
    return "/onboarding";
  }
  return "/dashboard";
}

/** Restore session on app load: refresh tokens + sync profile from API. */
export async function bootstrapAuth(): Promise<void> {
  const state = useAuthStore.getState();
  if (!state.refreshToken) {
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
