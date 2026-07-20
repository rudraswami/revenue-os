"use client";

import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { useShellConnectionHealth, useShellWhatsappAccounts } from "@/hooks/use-shell-data";
import { useAuthStore } from "@/stores/auth-store";

export type GlobalDashboardBanner = "trial" | "onboarding" | "token" | null;

/** Mirrors shell banners so Home can avoid duplicate alerts. */
export function useGlobalDashboardBanner(): GlobalDashboardBanner {
  const token = useAuthStore((s) => s.accessToken);

  const { data: billing } = useShellBilling<{
    entitlements?: {
      trialExpired: boolean;
      trialEndsAt: string | null;
      hasAccess: boolean;
    };
  }>();

  const access = billing?.entitlements;
  const trialEnded = access?.trialExpired ?? false;
  const trialEndsSoon =
    !!access &&
    !trialEnded &&
    !!access.trialEndsAt &&
    new Date(access.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  const trialBanner = !!access && !access.hasAccess && (trialEnded || trialEndsSoon);

  const { data: accounts } = useShellWhatsappAccounts();
  const connected = accounts?.some((a) => a.isActive) ?? false;
  const onboardingBanner = !!token && accounts != null && !connected;

  const { data: health } = useShellConnectionHealth<{
    tokenHealth?: { valid?: boolean; needsRefresh: boolean };
  }>({
    enabled: !!token && connected && !trialBanner,
  });

  const th = health?.tokenHealth;
  const tokenBanner = connected && !!th && (!th.valid || th.needsRefresh);

  if (trialBanner) return "trial";
  if (onboardingBanner) return "onboarding";
  if (tokenBanner) return "token";
  return null;
}
