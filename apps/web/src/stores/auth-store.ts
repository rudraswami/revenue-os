import { create } from "zustand";
import { persist } from "zustand/middleware";
import { syncAuthCookie } from "@/lib/auth-cookie";
import { clearRefreshCoordination } from "@/lib/auth-refresh-lock";
import { logLogout } from "@/lib/auth-observability";
import {
  clearPersistedRefreshToken,
  persistRefreshToken,
} from "@/lib/refresh-token-persist";
import type { LogoutReason, RefreshResultKind } from "@/lib/auth-session-death";
import type { MembershipRole } from "@growvisi/shared";
import type { AuthOrganization, AuthSession, AuthUser, OnboardingStatus } from "@/lib/auth-types";

interface RoleChangeNotice {
  previousRole: MembershipRole;
  newRole: MembershipRole;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  role: MembershipRole | null;
  onboarding: OnboardingStatus | null;
  /** Shown once when /auth/me reports a different role than the local store */
  roleChangeNotice: RoleChangeNotice | null;
  /** User chose to explore dashboard before connecting WhatsApp */
  onboardingDismissed: boolean;
  hydrated: boolean;
  /** Last non-fatal refresh failure — session must be preserved */
  lastTransientFailure: Extract<
    RefreshResultKind,
    "NETWORK_FAILURE" | "SERVER_FAILURE"
  > | null;
  setHydrated: (value: boolean) => void;
  setSession: (session: AuthSession) => void;
  /** Update profile/org from /auth/me without touching tokens. */
  patchProfile: (me: Pick<AuthSession, "user" | "organization" | "role" | "onboarding">) => void;
  /** Update access token from peer tab without wiping profile */
  patchAccessToken: (accessToken: string, refreshToken?: string) => void;
  setTransientFailure: (
    kind: Extract<RefreshResultKind, "NETWORK_FAILURE" | "SERVER_FAILURE"> | null,
  ) => void;
  patchOnboarding: (onboarding: OnboardingStatus) => void;
  setRoleChangeNotice: (previousRole: MembershipRole, newRole: MembershipRole) => void;
  clearRoleChangeNotice: () => void;
  dismissOnboarding: () => void;
  clear: (reason: LogoutReason) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      organization: null,
      role: null,
      onboarding: null,
      roleChangeNotice: null,
      onboardingDismissed: false,
      hydrated: false,
      lastTransientFailure: null,
      setHydrated: (hydrated) => set({ hydrated }),
      setSession: (session) => {
        syncAuthCookie(true);
        const refreshToken = session.refreshToken?.trim() || null;
        if (refreshToken) persistRefreshToken(refreshToken);
        set({
          accessToken: session.accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          user: session.user,
          organization: session.organization,
          role: session.role,
          onboarding: session.onboarding,
          lastTransientFailure: null,
        });
      },
      patchProfile: (me) => {
        const current = get();
        const roleChangeNotice =
          current.role && current.role !== me.role
            ? { previousRole: current.role, newRole: me.role }
            : current.roleChangeNotice;
        set({
          user: me.user,
          organization: me.organization,
          role: me.role,
          onboarding: me.onboarding,
          roleChangeNotice,
        });
      },
      patchAccessToken: (accessToken, refreshToken) => {
        syncAuthCookie(true);
        if (refreshToken) persistRefreshToken(refreshToken);
        set((s) => ({
          accessToken,
          refreshToken: refreshToken ?? s.refreshToken,
          lastTransientFailure: null,
        }));
      },
      setTransientFailure: (kind) => set({ lastTransientFailure: kind }),
      patchOnboarding: (onboarding) => set({ onboarding }),
      setRoleChangeNotice: (previousRole, newRole) =>
        set({ roleChangeNotice: { previousRole, newRole } }),
      clearRoleChangeNotice: () => set({ roleChangeNotice: null }),
      dismissOnboarding: () => set({ onboardingDismissed: true }),
      clear: (reason) => {
        logLogout(reason);
        syncAuthCookie(false);
        clearPersistedRefreshToken();
        clearRefreshCoordination();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          organization: null,
          role: null,
          onboarding: null,
          roleChangeNotice: null,
          onboardingDismissed: false,
          lastTransientFailure: null,
        });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: "growvisi-auth",
      // refreshToken persisted for silent refresh after reload (www → api cross-origin).
      // HttpOnly cookie is still primary when the browser sends it.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        organization: state.organization,
        role: state.role,
        onboarding: state.onboarding,
        onboardingDismissed: state.onboardingDismissed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.refreshToken) persistRefreshToken(state.refreshToken);
        state?.setHydrated(true);
      },
    },
  ),
);

/** @deprecated use organization.id from store */
export function organizationIdFromStore(): string | null {
  return useAuthStore.getState().organization?.id ?? null;
}
