import { create } from "zustand";
import { persist } from "zustand/middleware";
import { syncAuthCookie } from "@/lib/auth-cookie";
import type { AuthOrganization, AuthSession, AuthUser, OnboardingStatus } from "@/lib/auth-types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  onboarding: OnboardingStatus | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (session: AuthSession) => void;
  patchOnboarding: (onboarding: OnboardingStatus) => void;
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
      onboarding: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setSession: (session) => {
        syncAuthCookie(true);
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
          organization: session.organization,
          onboarding: session.onboarding,
        });
      },
      patchOnboarding: (onboarding) => set({ onboarding }),
      clear: () => {
        syncAuthCookie(false);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          organization: null,
          onboarding: null,
        });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: "growthsync-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        organization: state.organization,
        onboarding: state.onboarding,
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
