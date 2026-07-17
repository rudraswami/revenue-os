"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAuthStore } from "@/stores/auth-store";
import { AgencyConnectionBadge, type AgencyConnectionStatus } from "@/components/dashboard/agency-connection-badge";

/** Agency hub: portfolio WhatsApp health at a glance on Home. */
export function HomeAgencyPortfolioBanner() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () => apiFetch<{ isAgency: boolean }>("/agency/status", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["agency-clients-health"],
    queryFn: () =>
      apiFetch<{
        total: number;
        live: number;
        setup: number;
        token: number;
        disconnected: number;
      }>("/agency/clients/health-summary", { token: token ?? undefined }),
    enabled: !!token && !!agencyStatus?.isAgency,
    staleTime: 30_000,
  });

  if (!agencyStatus?.isAgency || !summary || summary.total === 0) return null;

  const needsAttention = summary.setup + summary.token + summary.disconnected;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-gradient-to-r from-[#f8f9ff] to-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {formatMessage(t("homeBanners.agencyTitle"), {
                live: summary.live,
                total: summary.total,
              })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {needsAttention > 0
                ? formatMessage(t("homeBanners.agencyNeedsAttention"), { count: needsAttention })
                : t("homeBanners.agencyAllHealthy")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["live", summary.live],
                  ["setup", summary.setup],
                  ["token", summary.token],
                  ["disconnected", summary.disconnected],
                ] as const
              )
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <span key={status} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <AgencyConnectionBadge status={status as AgencyConnectionStatus} />
                    <span className="font-semibold text-foreground">{count}</span>
                  </span>
                ))}
            </div>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 rounded-xl">
          <Link href="/dashboard/agency">
            {t("homeBanners.agencyManage")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
