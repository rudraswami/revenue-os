"use client";

import { useQuery } from "@tanstack/react-query";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { AiPersonaEditor } from "@/components/dashboard/automations/ai-persona-editor";
import { IndustryHandbookPicker } from "@/components/dashboard/industry-handbook-picker";
import { apiFetch } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

/** Industry template + optional persona overrides — single home in Settings → AI & replies. */
export function IndustryPersonaSettingsSection() {
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
    <div className="space-y-5">
      <IndustryHandbookPicker
        canManage={canManage}
        currentIndustryId={data?.industryId}
        settings={data}
        businessName={businessName}
        token={token}
        showHeading
      />
      <AiPersonaEditor
        canManage={canManage}
        token={token}
        settings={data}
        businessName={businessName}
      />
    </div>
  );
}
