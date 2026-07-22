"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { WhatsAppAssistantZone } from "@/components/dashboard/automations/whatsapp-assistant-zone";
import { TeamAlertsZone } from "@/components/dashboard/automations/team-alerts-zone";
import { AutomationActivityZone } from "@/components/dashboard/automations/automation-activity-zone";
import { QueryErrorState } from "@/components/ui/query-state";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { autonomyLabel } from "@/lib/automation-scenarios";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
} from "@/lib/automation-preferences";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { Badge } from "@/components/ui/badge";
import { ArrowDown } from "lucide-react";

export default function AutomationsPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: intelligence, isError: intelError, refetch: refetchIntel } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: toggles, isError: prefsError, refetch: refetchPrefs } = useQuery({
    queryKey: ["automation-preferences"],
    queryFn: () =>
      apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    initialData: DEFAULT_AUTOMATIONS,
  });

  const activeAlerts = Object.entries(toggles ?? DEFAULT_AUTOMATIONS).filter(
    ([id, on]) => id !== "welcome" && on,
  ).length;

  const mode = intelligence?.replyAutonomy ?? "assist";

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Automations"
        description="Your WhatsApp assistant and team alerts — one place to control both."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="font-semibold">
              {autonomyLabel(mode)}
            </Badge>
            {activeAlerts > 0 ? (
              <Badge variant="secondary">
                {activeAlerts} team alert{activeAlerts === 1 ? "" : "s"} on
              </Badge>
            ) : null}
          </div>
        }
        action={
          <Link
            href="#automation-activity"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-accent/30 hover:text-foreground"
          >
            View activity
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />

      {intelError || prefsError ? (
        <QueryErrorState
          title="Couldn't load automation settings"
          onRetry={() => {
            void refetchIntel();
            void refetchPrefs();
          }}
        />
      ) : (
        <>
          <WhatsAppAssistantZone />

          <div className="my-12 border-t border-border/60" role="separator" />

          <TeamAlertsZone />

          <div className="mt-10">
            <AutomationActivityZone />
          </div>
        </>
      )}
    </div>
  );
}
