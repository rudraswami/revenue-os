import { create } from "zustand";
import { persist } from "zustand/middleware";
import { syncAuthCookie } from "@/lib/auth-cookie";
import { clearRefreshCoordination } from "@/lib/auth-refresh-lock";
import { logLogout } from "@/lib/auth-observability";
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
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
          organization: session.organization,
          role: session.role,
          onboarding: session.onboarding,
          lastTransientFailure: null,
        });
      },
      patchAccessToken: (accessToken, refreshToken) => {
        syncAuthCookie(true);
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
      // NOTE: refreshToken is deliberately NOT persisted. It lives in an HttpOnly
      // cookie set by the API, so it cannot be stolen via XSS from localStorage.
      // The short-lived accessToken is persisted to avoid a refresh round-trip on
      // every reload; it is rotated via the cookie when it expires.
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        organization: state.organization,
        role: state.role,
        onboarding: state.onboarding,
        onboardingDismissed: state.onboardingDismissed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** @deprecated use organization.id from store */
export function organizationIdFromStore(): string | null {
  return useAuthStore.getState().organization?.id ?? null;
}
