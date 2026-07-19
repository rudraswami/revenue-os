"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { computeSetupActions } from "@/lib/setup-actions";
import { useAuthStore } from "@/stores/auth-store";

export type { SetupAction, SetupActionPriority } from "@/lib/setup-actions";

export function usePendingSetupActions() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: billing } = useQuery({
    queryKey: QUERY_KEYS.billing,
    queryFn: () =>
      apiFetch<{
        entitlements?: {
          trialExpired: boolean;
          trialEndsAt: string | null;
          hasAccess: boolean;
          planId: string;
        };
        usage?: {
          teamMembers: number;
          whatsappNumbers: number;
          monthlyLeads: number;
        };
        limits?: {
          teamMembers: number;
          whatsappNumbers: number;
          monthlyLeads: number;
        };
        friction?: {
          seatsAtLimit: boolean;
          whatsappAtLimit: boolean;
          leadsAtLimit: boolean;
          primaryReason: string | null;
          suggestedPlan: string | null;
        };
      }>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.dashboard,
  });

  const { data: progress } = useQuery({
    queryKey: QUERY_KEYS.onboardingProgress,
    queryFn: () =>
      apiFetch<Parameters<typeof computeSetupActions>[0]["progress"]>(
        "/organizations/onboarding-progress",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: STALE.dashboard,
  });

  const { data: accounts } = useQuery({
    queryKey: QUERY_KEYS.whatsappAccounts,
    queryFn: () =>
      apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: STALE.dashboard,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;

  const { data: health } = useQuery({
    queryKey: QUERY_KEYS.whatsappConnectionHealth,
    queryFn: () =>
      apiFetch<{ tokenHealth?: { valid?: boolean; needsRefresh: boolean } }>(
        "/whatsapp-accounts/connection-health",
        { token: token ?? undefined },
      ),
    enabled: !!token && connected,
    staleTime: STALE.live,
  });

  const { data: payment } = useQuery({
    queryKey: QUERY_KEYS.paymentIntegration,
    queryFn: () =>
      apiFetch<{ hasWebhookSecret: boolean; autoWinOnPayment: boolean }>(
        "/organizations/payment-integration",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: STALE.config,
  });

  const { data: capabilities } = useQuery({
    queryKey: QUERY_KEYS.conversationCapabilities,
    queryFn: () =>
      apiFetch<{ aiClassification: boolean }>("/conversations/capabilities", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: STALE.config,
  });

  const derived = useMemo(
    () =>
      computeSetupActions({
        billing,
        progress,
        accounts,
        health,
        payment: payment ?? null,
        capabilities: capabilities ?? { aiClassification: true },
      }),
    [billing, progress, accounts, health, payment, capabilities],
  );

  const isLoading =
    !!token &&
    (billing === undefined ||
      progress === undefined ||
      accounts === undefined ||
      (connected && health === undefined));

  return {
    ...derived,
    isLoading,
  };
}
