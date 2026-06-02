import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  organizationSlug: string | null;
  setTokens: (access: string, refresh: string, orgSlug: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      organizationSlug: null,
      setTokens: (accessToken, refreshToken, organizationSlug) =>
        set({ accessToken, refreshToken, organizationSlug }),
      clear: () => set({ accessToken: null, refreshToken: null, organizationSlug: null }),
    }),
    { name: "revenue-os-auth" },
  ),
);
