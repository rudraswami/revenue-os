"use client";

import { apiFetch } from "@/lib/api-client";
import type { OnboardingProgressInput } from "@/lib/setup-actions";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";
import { useShellCachedQuery } from "@/hooks/use-shell-cached-query";
import type { UseQueryResult } from "@tanstack/react-query";

/** Post-activation coaching slice seeded by shell bootstrap. */
export function useShellOnboardingCoaching<
  T extends {
    coaching?: {
      eligible: boolean;
      hasTakeover?: boolean;
      next: null | { id: string };
    };
  } = {
    coaching?: {
      eligible: boolean;
      hasTakeover?: boolean;
      next: null | { id: string };
    };
  },
>() {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.onboardingCoaching,
    queryFn: () =>
      apiFetch<T>("/organizations/onboarding-progress?scope=coaching", {
        token: token ?? undefined,
      }),
    staleTime: STALE.dashboard,
  });
}

/** Onboarding progress seeded by shell bootstrap. */
export function useShellOnboardingProgress<T = OnboardingProgressInput>(
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    allowFetchBeforeBootstrap?: boolean;
  },
): UseQueryResult<T, Error> {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.onboardingProgress,
    queryFn: () =>
      apiFetch<T>("/organizations/onboarding-progress", { token: token ?? undefined }),
    staleTime: STALE.dashboard,
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    allowFetchBeforeBootstrap: options?.allowFetchBeforeBootstrap,
  });
}

/** WhatsApp accounts (active flags) seeded by shell bootstrap. */
export function useShellWhatsappAccounts<
  T extends Array<{ isActive: boolean }> = Array<{ isActive: boolean }>,
>(options?: { allowFetchBeforeBootstrap?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.whatsappAccounts,
    queryFn: () => apiFetch<T>("/whatsapp-accounts", { token: token ?? undefined }),
    staleTime: STALE.dashboard,
    allowFetchBeforeBootstrap: options?.allowFetchBeforeBootstrap,
  });
}

/** Agency status seeded by shell bootstrap. */
export function useShellAgencyStatus<
  T extends { isAgency: boolean; canEnableAgency?: boolean } = {
    isAgency: boolean;
    canEnableAgency: boolean;
  },
>() {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.agencyStatus,
    queryFn: () => apiFetch<T>("/agency/status", { token: token ?? undefined }),
    staleTime: STALE.dashboard,
  });
}

/** AI capability flags seeded by shell bootstrap. */
export function useShellConversationCapabilities<
  T extends { aiClassification: boolean; aiSuggestReply?: boolean } = {
    aiClassification: boolean;
    aiSuggestReply: boolean;
  },
>() {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.conversationCapabilities,
    queryFn: () =>
      apiFetch<T>("/conversations/capabilities", { token: token ?? undefined }),
    staleTime: STALE.config,
  });
}

/** Connection health seeded by shell bootstrap when WhatsApp is connected. */
export function useShellConnectionHealth<
  T extends { tokenHealth?: { valid?: boolean; needsRefresh: boolean } } = {
    tokenHealth?: { valid?: boolean; needsRefresh: boolean };
  },
>(options?: { enabled?: boolean; refetchInterval?: number | false; allowFetchBeforeBootstrap?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.whatsappConnectionHealth,
    queryFn: () =>
      apiFetch<T>("/whatsapp-accounts/connection-health", { token: token ?? undefined }),
    staleTime: STALE.live,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    allowFetchBeforeBootstrap: options?.allowFetchBeforeBootstrap,
  });
}
export function useShellPaymentIntegration<
  T extends { hasWebhookSecret: boolean; autoWinOnPayment: boolean } = {
    hasWebhookSecret: boolean;
    autoWinOnPayment: boolean;
  },
>(options?: { enabled?: boolean; allowFetchBeforeBootstrap?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  return useShellCachedQuery<T>({
    queryKey: QUERY_KEYS.paymentIntegration,
    queryFn: () =>
      apiFetch<T>("/organizations/payment-integration", { token: token ?? undefined }),
    staleTime: STALE.config,
    enabled: options?.enabled,
    allowFetchBeforeBootstrap: options?.allowFetchBeforeBootstrap,
  });
}
