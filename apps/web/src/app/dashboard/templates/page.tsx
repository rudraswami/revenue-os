"use client";

import { TemplateManagementView } from "@/components/dashboard/templates/template-management-view";
import { CampaignsPlanGate } from "@/components/dashboard/campaigns-plan-gate";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { canUseCampaignsFeatures, type CampaignsBillingSnapshot } from "@/lib/campaigns-plan-access";

export default function TemplatesPage() {
  const { data: billing, isSuccess: billingReady } = useShellBilling<CampaignsBillingSnapshot>();
  const campaignsPlanOk = billingReady ? canUseCampaignsFeatures(billing) : null;

  if (campaignsPlanOk === false) {
    return (
      <div className="dashboard-page px-4 py-8 lg:px-8">
        <CampaignsPlanGate billing={billing} />
      </div>
    );
  }

  if (campaignsPlanOk === null) {
    return null;
  }

  return <TemplateManagementView />;
}
