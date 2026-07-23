"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { IndustryHandbookPicker } from "@/components/dashboard/industry-handbook-picker";
import { apiFetch } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

export function IndustryTemplateCard() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const businessName = useAuthStore((s) => s.organization?.name) ?? "your business";
  const canManage = canManageCampaigns(role);

  const { data } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  return (
    <IndustryHandbookPicker
      canManage={canManage}
      currentIndustryId={data?.industryId}
      settings={data}
      businessName={businessName}
      token={token}
      showHeading={false}
    />
  );
}
