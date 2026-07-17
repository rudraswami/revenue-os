"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/settings-section";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Settings entry for Partner install kit — enablement docs, not daily nav.
 * Shown only for Operator agency-capable workspaces.
 */
export function PartnerInstallKitSettingsCard() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () =>
      apiFetch<{ isAgency: boolean; canEnableAgency: boolean }>("/agency/status", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 120_000,
  });

  const show = !!agencyStatus?.isAgency || !!agencyStatus?.canEnableAgency;
  if (!show) return null;

  return (
    <SettingsSection
      title={t("settings.partnerKitSectionTitle")}
      description={t("settings.partnerKitSectionDescription")}
    >
      <div className="rounded-2xl border border-border bg-gradient-to-r from-[#f8f9ff] to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("settings.partnerKitTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("settings.partnerKitBody")}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl">
              <Link href="/dashboard/agency">
                <Building2 className="h-3.5 w-3.5" />
                {t("settings.partnerKitAgency")}
              </Link>
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5 rounded-xl">
              <Link href="/dashboard/partner">
                {t("settings.partnerKitOpen")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
