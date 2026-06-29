"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Loader2,
  Plus,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { applySession } from "@/lib/auth-session";
import type { AuthSession } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatInr } from "@/lib/crm";
import { useAuthStore } from "@/stores/auth-store";
import {
  AgencyConnectionBadge,
  type AgencyConnectionStatus,
} from "@/components/dashboard/agency-connection-badge";
import { AgencyClientConnectDialog } from "@/components/dashboard/agency-client-connect-dialog";
import { cn } from "@/lib/utils";

interface AgencyStatus {
  kind: string;
  isAgency: boolean;
  canEnableAgency: boolean;
  clientCount: number;
  clientLimit: number;
}

interface AgencyClientRow {
  id: string;
  displayName: string;
  organizationId: string;
  slug: string;
  whatsappConnected: boolean;
  unreadMessages: number;
  handoffs: number;
  openPipelineInr: number;
  openLeads: number;
  connectionStatus: AgencyConnectionStatus;
  goLiveProgressPct: number;
  displayPhoneNumber: string | null;
  tokenNeedsRefresh: boolean;
}

export default function AgencyPage() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const [clientName, setClientName] = useState("");
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [connectClient, setConnectClient] = useState<AgencyClientRow | null>(null);
  const [connectMode, setConnectMode] = useState<"facebook" | "token">("facebook");
  const qc = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () => apiFetch<AgencyStatus>("/agency/status", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["agency-clients"],
    queryFn: () => apiFetch<AgencyClientRow[]>("/agency/clients", { token: token ?? undefined }),
    enabled: !!token && !!status?.isAgency,
  });

  const enableMutation = useMutation({
    mutationFn: () =>
      apiFetch("/agency/enable", { method: "POST", token: token ?? undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["agency-status"] }),
  });

  const createMutation = useMutation({
    mutationFn: (displayName: string) =>
      apiFetch("/agency/clients", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ displayName }),
      }),
    onSuccess: () => {
      setClientName("");
      void qc.invalidateQueries({ queryKey: ["agency-clients"] });
      void qc.invalidateQueries({ queryKey: ["agency-status"] });
    },
  });

  async function switchToClient(organizationId: string, redirectTo?: string) {
    if (!token || switchingId) return;
    setSwitchingId(organizationId);
    try {
      const session = await apiFetch<AuthSession>("/auth/switch-organization", {
        method: "POST",
        token,
        body: JSON.stringify({ organizationId }),
      });
      applySession(session);
      window.location.href = redirectTo ?? "/dashboard";
    } finally {
      setSwitchingId(null);
    }
  }

  const loading = statusLoading || (status?.isAgency && clientsLoading);

  const healthCounts = clients?.reduce(
    (acc, c) => {
      acc[c.connectionStatus] += 1;
      return acc;
    },
    { live: 0, setup: 0, token: 0, disconnected: 0 } as Record<AgencyConnectionStatus, number>,
  );

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={t("groups.growth")}
        title={t("agency.title")}
        description={t("agency.description")}
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : !status?.isAgency ? (
        <DashboardPanel>
          <div className="flex flex-col items-center py-8 text-center">
            <Building2 className="h-10 w-10 text-accent" />
            <h3 className="mt-4 text-lg font-bold">{t("agency.enableAgency")}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {status?.canEnableAgency
                ? "Pro plan unlocks up to 15 client workspaces — each with its own WhatsApp, pipeline, and team."
                : t("agency.proRequired")}
            </p>
            {status?.canEnableAgency ? (
              <Button
                className="mt-4 rounded-xl"
                disabled={enableMutation.isPending}
                onClick={() => enableMutation.mutate()}
              >
                {enableMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t("agency.enableAgency")}
              </Button>
            ) : (
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/pricing?plan=pro">
                  Upgrade to Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </DashboardPanel>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {status.clientCount} / {status.clientLimit} {t("agency.clientsUsed")}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Client business name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-9 w-48 text-sm"
              />
              <Button
                size="sm"
                className="gap-1.5 rounded-xl"
                disabled={!clientName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(clientName.trim())}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("common.addClient")}
              </Button>
            </div>
          </div>

          {clients && clients.length > 0 && healthCounts && (
            <div className="mb-6 grid gap-3 sm:grid-cols-4">
              {(
                [
                  ["live", "Live clients", healthCounts.live],
                  ["setup", "In setup", healthCounts.setup],
                  ["token", "Token action", healthCounts.token],
                  ["disconnected", "Not connected", healthCounts.disconnected],
                ] as const
              ).map(([status, label, count]) => (
                <div
                  key={status}
                  className="rounded-xl border border-[#dce9ff] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <AgencyConnectionBadge status={status} />
                  </div>
                  <p className="mt-1 text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}

          {!clients?.length ? (
            <DashboardPanel>
              <EmptyState
                compact
                title={t("agency.empty")}
                description={t("agency.emptyHint")}
              />
            </DashboardPanel>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#dce9ff] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{c.displayName}</p>
                      <p className="text-xs text-muted-foreground">{c.slug}</p>
                      {c.displayPhoneNumber && (
                        <p className="mt-1 truncate text-xs font-medium text-foreground/80">
                          {c.displayPhoneNumber}
                        </p>
                      )}
                    </div>
                    <AgencyConnectionBadge status={c.connectionStatus} />
                  </div>

                  {c.whatsappConnected && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[10px] font-medium text-muted-foreground">
                        <span>Go-live</span>
                        <span>{c.goLiveProgressPct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            c.connectionStatus === "live"
                              ? "bg-[#25D366]"
                              : c.connectionStatus === "token"
                                ? "bg-red-500"
                                : "bg-amber-500",
                          )}
                          style={{ width: `${c.goLiveProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {c.tokenNeedsRefresh && (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      {t("agency.tokenNeedsRefresh")}
                    </p>
                  )}

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-[#f8f9ff] px-2.5 py-2">
                      <dt className="text-muted-foreground">Pipeline</dt>
                      <dd className="font-bold">{formatInr(Math.round(c.openPipelineInr * 100))}</dd>
                    </div>
                    <div className="rounded-lg bg-[#f8f9ff] px-2.5 py-2">
                      <dt className="text-muted-foreground">Open leads</dt>
                      <dd className="font-bold">{c.openLeads}</dd>
                    </div>
                    <div className="rounded-lg bg-amber-50/80 px-2.5 py-2">
                      <dt className="text-muted-foreground">Handoffs</dt>
                      <dd className="font-bold text-amber-900">{c.handoffs}</dd>
                    </div>
                    <div className="rounded-lg bg-[#f8f9ff] px-2.5 py-2">
                      <dt className="text-muted-foreground">Unread</dt>
                      <dd className="font-bold">{c.unreadMessages}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 rounded-xl"
                      disabled={switchingId === c.organizationId}
                      onClick={() => void switchToClient(c.organizationId)}
                    >
                      {switchingId === c.organizationId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5" />
                      )}
                      {t("common.switchClient")}
                    </Button>
                    {!c.whatsappConnected && (
                      <>
                        <Button
                          size="sm"
                          className="w-full gap-1.5 rounded-xl"
                          onClick={() => {
                            setConnectMode("facebook");
                            setConnectClient(c);
                          }}
                        >
                          <Wifi className="h-3.5 w-3.5" />
                          {t("agency.connectFacebook")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 rounded-xl"
                          onClick={() => {
                            setConnectMode("token");
                            setConnectClient(c);
                          }}
                        >
                          {t("agency.connectToken")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 rounded-xl"
                          disabled={switchingId === c.organizationId}
                          onClick={() =>
                            void switchToClient(c.organizationId, "/onboarding?from=agency")
                          }
                        >
                          {t("agency.switchUseToken")}
                        </Button>
                      </>
                    )}
                    {c.connectionStatus === "setup" && c.whatsappConnected && (
                      <Button
                        size="sm"
                        variant="accent"
                        className="w-full gap-1.5 rounded-xl"
                        disabled={switchingId === c.organizationId}
                        onClick={() =>
                          void switchToClient(c.organizationId, "/onboarding?from=agency")
                        }
                      >
                        {t("agency.continueSetup")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Each client gets an isolated workspace with its own trial/billing. Your agency team is
        added as admin on new clients automatically.{" "}
        <Link href="/dashboard/partner" className="font-semibold text-accent hover:underline">
          Partner install kit →
        </Link>{" "}
        ·{" "}
        <Link href="/dashboard/pricing" className="font-semibold text-accent hover:underline">
          View Pro plan →
        </Link>
      </p>

      {connectClient && (
        <AgencyClientConnectDialog
          clientOrganizationId={connectClient.organizationId}
          clientName={connectClient.displayName}
          open={!!connectClient}
          initialMode={connectMode}
          onOpenChange={(open) => {
            if (!open) setConnectClient(null);
          }}
        />
      )}
    </div>
  );
}
