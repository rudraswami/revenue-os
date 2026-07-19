import type { QueryClient } from "@tanstack/react-query";
import { applyMeResponse } from "@/lib/auth-session";
import type { MeResponse } from "@/lib/auth-types";
import { QUERY_KEYS } from "@/lib/query-config";
import type { OnboardingProgressInput } from "@/lib/setup-actions";

export interface ShellBootstrapResponse {
  me: MeResponse;
  billing: {
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
  };
  agency: {
    isAgency: boolean;
    canEnableAgency: boolean;
  };
  whatsapp: {
    accounts: Array<{ isActive: boolean }>;
    connectionHealth?: {
      tokenHealth?: { valid?: boolean; needsRefresh: boolean };
    };
  };
  onboardingProgress: OnboardingProgressInput;
  capabilities: {
    aiClassification: boolean;
    aiSuggestReply?: boolean;
  };
  paymentIntegration?: {
    hasWebhookSecret: boolean;
    autoWinOnPayment: boolean;
  };
}

/** Seed React Query caches consumed by sidebar, banners, and setup FAB. */
export function seedDashboardShellCache(
  queryClient: QueryClient,
  data: ShellBootstrapResponse,
): void {
  queryClient.setQueryData(QUERY_KEYS.authMe, data.me);
  queryClient.setQueryData(QUERY_KEYS.billing, data.billing);
  queryClient.setQueryData(QUERY_KEYS.whatsappAccounts, data.whatsapp.accounts);
  queryClient.setQueryData(QUERY_KEYS.onboardingProgress, data.onboardingProgress);
  queryClient.setQueryData(QUERY_KEYS.conversationCapabilities, data.capabilities);
  queryClient.setQueryData(QUERY_KEYS.agencyStatus, data.agency);

  if (data.whatsapp.connectionHealth) {
    queryClient.setQueryData(QUERY_KEYS.whatsappConnectionHealth, data.whatsapp.connectionHealth);
  }
  if (data.paymentIntegration) {
    queryClient.setQueryData(QUERY_KEYS.paymentIntegration, data.paymentIntegration);
  }

  applyMeResponse(data.me);
}
