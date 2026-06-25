import { create } from "zustand";
import { persist } from "zustand/middleware";
import { syncAuthCookie } from "@/lib/auth-cookie";
import type { MembershipRole } from "@growvisi/shared";
import type { AuthOrganization, AuthSession, AuthUser, OnboardingStatus } from "@/lib/auth-types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  role: MembershipRole | null;
  onboarding: OnboardingStatus | null;
  /** User chose to explore dashboard before connecting WhatsApp */
  onboardingDismissed: boolean;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (session: AuthSession) => void;
  patchOnboarding: (onboarding: OnboardingStatus) => void;
  dismissOnboarding: () => void;
  clear: () => void;
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
      onboardingDismissed: false,
      hydrated: false,
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
        });
      },
      patchOnboarding: (onboarding) => set({ onboarding }),
      dismissOnboarding: () => set({ onboardingDismissed: true }),
      clear: () => {
        syncAuthCookie(false);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          organization: null,
          role: null,
          onboarding: null,
          onboardingDismissed: false,
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
