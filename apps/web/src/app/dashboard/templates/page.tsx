"use client";

import { TemplateManagementView } from "@/components/dashboard/templates/template-management-view";
import { CampaignsPlanGate } from "@/components/dashboard/campaigns-plan-gate";
import { useShellBilling } from "@/hooks/use-shell-cached-query";

function parseCampaignsPlanOk(billing?: {
  planId?: string;
  hasAccess?: boolean;
} | null): boolean {
  if (!billing?.hasAccess) return false;
  const plan = billing.planId ?? "trial";
  return plan === "growth" || plan === "pro";
}

export default function TemplatesPage() {
  const { data: billing, isSuccess: billingReady } = useShellBilling();
  const campaignsPlanOk = billingReady ? parseCampaignsPlanOk(billing) : null;

  if (campaignsPlanOk === false) {
    return (
      <div className="dashboard-page px-4 py-8 lg:px-8">
        <CampaignsPlanGate />
      </div>
    );
  }

  if (campaignsPlanOk === null) {
    return null;
  }

  return <TemplateManagementView />;
}
