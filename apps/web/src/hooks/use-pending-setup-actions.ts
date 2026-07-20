"use client";

import { useMemo } from "react";
import { computeSetupActions, type OnboardingProgressInput } from "@/lib/setup-actions";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import {
  useShellConversationCapabilities,
  useShellConnectionHealth,
  useShellOnboardingProgress,
  useShellPaymentIntegration,
  useShellWhatsappAccounts,
} from "@/hooks/use-shell-data";
import { canManageBilling } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

export type { SetupAction, SetupActionPriority } from "@/lib/setup-actions";

export function usePendingSetupActions() {
  const role = useAuthStore((s) => s.role);
  const canManagePayment = canManageBilling(role);

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

  const { data: progress } = useShellOnboardingProgress<OnboardingProgressInput>();

  const { data: accounts } = useShellWhatsappAccounts();
  const connected = accounts?.some((a) => a.isActive) ?? false;

  const { data: health } = useShellConnectionHealth({ enabled: connected });

  const { data: payment } = useShellPaymentIntegration({ enabled: canManagePayment });

  const { data: capabilities } = useShellConversationCapabilities<{
    aiClassification: boolean;
  }>();

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
    billing === undefined ||
    progress === undefined ||
    accounts === undefined ||
    (connected && health === undefined);

  return {
    ...derived,
    isLoading,
  };
}
