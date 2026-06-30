"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export type GlobalDashboardBanner = "trial" | "onboarding" | "token" | null;

/** Mirrors shell banners so Home can avoid duplicate alerts. */
export function useGlobalDashboardBanner(): GlobalDashboardBanner {
  const token = useAuthStore((s) => s.accessToken);

  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () =>
      apiFetch<{
        entitlements?: {
          trialExpired: boolean;
          trialEndsAt: string | null;
          hasAccess: boolean;
        };
      }>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const access = billing?.entitlements;
  const trialEnded = access?.trialExpired ?? false;
  const trialEndsSoon =
    !!access &&
    !trialEnded &&
    !!access.trialEndsAt &&
    new Date(access.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  const trialBanner = !!access && !access.hasAccess && (trialEnded || trialEndsSoon);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token && !trialBanner,
    staleTime: 30_000,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;
  const onboardingBanner = !!token && accounts != null && !connected;

  const { data: health } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<{
        tokenHealth?: { valid?: boolean; needsRefresh: boolean };
      }>("/whatsapp-accounts/connection-health", { token: token ?? undefined }),
    enabled: !!token && connected && !trialBanner,
    staleTime: 30_000,
  });

  const th = health?.tokenHealth;
  const tokenBanner = connected && !!th && (!th.valid || th.needsRefresh);

  if (trialBanner) return "trial";
  if (onboardingBanner) return "onboarding";
  if (tokenBanner) return "token";
  return null;
}
