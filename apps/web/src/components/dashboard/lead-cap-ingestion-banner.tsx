"use client";

import { useQuery } from "@tanstack/react-query";
import { UpgradeFrictionBanner } from "@/components/dashboard/upgrade-friction-banner";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";

interface BillingWithSignals {
  usage?: { monthlyLeads: number };
  limits?: { monthlyLeads: number };
  friction?: {
    leadsAtLimit: boolean;
    suggestedPlan: string | null;
  };
  entitlements?: { hasAccess: boolean };
  signals?: {
    leadsIngestionCapped: boolean;
    leadsSkippedThisMonth: number;
  };
}

/**
 * Warns when monthly lead cap blocks new contacts from entering the pipeline.
 * Messages still land in Conversations — only pipeline scoring is paused.
 */
export function LeadCapIngestionBanner({ className }: { className?: string }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data } = useQuery({
    queryKey: QUERY_KEYS.billing,
    queryFn: () => apiFetch<BillingWithSignals>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.dashboard,
  });

  const capped = data?.signals?.leadsIngestionCapped ?? data?.friction?.leadsAtLimit;
  const hasAccess = data?.entitlements?.hasAccess ?? true;
  if (!capped || !hasAccess) return null;

  const skipped = data?.signals?.leadsSkippedThisMonth ?? 0;
  const used = data?.usage?.monthlyLeads;
  const limit = data?.limits?.monthlyLeads;

  const skippedNote =
    skipped > 0
      ? ` ${skipped} new contact${skipped === 1 ? "" : "s"} this month arrived in Conversations but were not added to your pipeline.`
      : " New WhatsApp contacts will appear in Conversations but won't be added to your pipeline until you upgrade.";

  return (
    <div className={className ?? "mx-4 mb-3 mt-4 lg:mx-8 lg:mt-6"}>
      <UpgradeFrictionBanner
        reason="leads"
        suggestedPlan={data?.friction?.suggestedPlan ?? "starter"}
        used={used}
        limit={limit}
        message={`Monthly lead limit reached.${skippedNote}`}
      />
    </div>
  );
}
