"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  computeAgencySetupActions,
  computeSetupActions,
  type AgencyHealthSummary,
  type OnboardingProgressInput,
} from "@/lib/setup-actions";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import {
  useShellAgencyStatus,
  useShellConversationCapabilities,
  useShellConnectionHealth,
  useShellOnboardingProgress,
  useShellWhatsappAccounts,
} from "@/hooks/use-shell-data";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export type { SetupAction, SetupActionPriority } from "@/lib/setup-actions";

export function usePendingSetupActions() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  const { data: agencyStatus } = useShellAgencyStatus();
  const isAgency = !!agencyStatus?.isAgency;

  const { data: agencyHealth } = useQuery({
    queryKey: ["agency-clients-health"],
    queryFn: () => apiFetch<AgencyHealthSummary>("/agency/clients/health-summary", { token: token ?? undefined }),
    enabled: !!token && isAgency,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: billing } = useShellBilling<{
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
  }>();

  const { data: progress } = useShellOnboardingProgress<OnboardingProgressInput>({
    enabled: !isAgency,
    refetchInterval: 30_000,
  });

  const { data: accounts } = useShellWhatsappAccounts();
  const connected = !isAgency && (accounts?.some((a) => a.isActive) ?? false);

  const { data: health } = useShellConnectionHealth({
    enabled: !isAgency && connected,
  });

  const { data: capabilities } = useShellConversationCapabilities();

  const derived = useMemo(() => {
    if (isAgency) {
      return computeAgencySetupActions(agencyHealth);
    }
    return computeSetupActions({
      billing,
      progress,
      accounts,
      health: health ?? null,
      capabilities: capabilities ?? { aiClassification: true },
      actor: { role },
    });
  }, [
    isAgency,
    agencyHealth,
    billing,
    progress,
    accounts,
    health,
    capabilities,
    role,
  ]);

  const isLoading = isAgency
    ? agencyHealth === undefined
    : billing === undefined ||
      progress === undefined ||
      accounts === undefined ||
      (connected && health === undefined);

  return {
    ...derived,
    isLoading,
    isAgency,
  };
}
