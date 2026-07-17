"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Wifi,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastOptional } from "@/components/ui/toast";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { applySession } from "@/lib/auth-session";
import type { AuthSession } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatMessage } from "@/lib/i18n/format-message";
import { formatInr } from "@/lib/crm";
import { trackAgencyPartner } from "@/lib/agency-partner-analytics";
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
  needsReconnect: boolean;
  planId: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

interface AgencyHealthSummary {
  total: number;
  live: number;
  setup: number;
  token: number;
  reconnect: number;
  disconnected: number;
  openPipelineInr: number;
  handoffs: number;
  unreadMessages: number;
  clients: AgencyClientRow[];
}

function planDisplayName(planId: string, t: (path: string) => string): string {
  if (planId === "trial") return t("agency.planTrial");
  if (planId === "pro") return "Operator";
  return planId.charAt(0).toUpperCase() + planId.slice(1);
}

function clientNeedsAttention(c: AgencyClientRow): boolean {
  return (
    c.needsReconnect ||
    c.connectionStatus === "token" ||
    c.connectionStatus === "setup" ||
    c.connectionStatus === "disconnected"
  );
}

function invalidateAgencyQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["agency-status"] });
  void qc.invalidateQueries({ queryKey: ["agency-clients-health"] });
}

export default function AgencyPage() {
  const { t } = useI18n();
  const toast = useToastOptional();
  const token = useAuthStore((s) => s.accessToken);
  const [clientName, setClientName] = useState("");
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [connectClient, setConnectClient] = useState<AgencyClientRow | null>(null);
  const qc = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () => apiFetch<AgencyStatus>("/agency/status", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["agency-clients-health"],
    queryFn: () =>
      apiFetch<AgencyHealthSummary>("/agency/clients/health-summary", {
        token: token ?? undefined,
      }),
    enabled: !!token && !!status?.isAgency,
  });

  const clients = health?.clients ?? [];

  useEffect(() => {
    if (statusLoading) return;
    trackAgencyPartner("agency_hub_view", {
      isAgency: status?.isAgency,
      canEnable: status?.canEnableAgency,
      clientCount: status?.clientCount,
    });
  }, [statusLoading, status?.isAgency, status?.canEnableAgency, status?.clientCount]);

  const attentionClients = useMemo(
    () => clients.filter(clientNeedsAttention),
    [clients],
  );

  const enableMutation = useMutation({
    mutationFn: () =>
      apiFetch("/agency/enable", { method: "POST", token: token ?? undefined }),
    onMutate: () => trackAgencyPartner("agency_enable_click"),
    onSuccess: () => {
      trackAgencyPartner("agency_enable_success");
      toast.success(t("agency.enabled"));
      invalidateAgencyQueries(qc);
    },
    onError: (e) => toast.error(toUserMessage(e, t("agency.actionFailed"))),
  });

  const createMutation = useMutation({
    mutationFn: (displayName: string) =>
      apiFetch("/agency/clients", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ displayName }),
      }),
    onSuccess: () => {
      trackAgencyPartner("agency_client_created");
      toast.success(t("agency.created"));
      setClientName("");
      invalidateAgencyQueries(qc);
    },
    onError: (e) => toast.error(toUserMessage(e, t("agency.actionFailed"))),
  });

  const renameMutation = useMutation({
    mutationFn: ({ organizationId, displayName }: { organizationId: string; displayName: string }) =>
      apiFetch(`/agency/clients/${organizationId}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ displayName }),
      }),
    onSuccess: (_data, vars) => {
      trackAgencyPartner("agency_client_renamed", { organizationId: vars.organizationId });
      toast.success(t("agency.renameSaved"));
      invalidateAgencyQueries(qc);
    },
    onError: (e) => toast.error(toUserMessage(e, t("agency.actionFailed"))),
  });

  const removeMutation = useMutation({
    mutationFn: (organizationId: string) =>
      apiFetch(`/agency/clients/${organizationId}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: (_data, organizationId) => {
      trackAgencyPartner("agency_client_removed", { organizationId });
      toast.success(t("agency.removed"));
      invalidateAgencyQueries(qc);
    },
    onError: (e) => toast.error(toUserMessage(e, t("agency.actionFailed"))),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ organizationId, email }: { organizationId: string; email: string }) =>
      apiFetch(`/agency/clients/${organizationId}/invite-owner`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ email }),
      }),
    onSuccess: (_data, vars) => {
      trackAgencyPartner("agency_invite_owner", { organizationId: vars.organizationId });
      toast.success(t("agency.inviteSent"));
    },
    onError: (e) => toast.error(toUserMessage(e, t("agency.actionFailed"))),
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

  function openConnectDialog(client: AgencyClientRow, reconnect: boolean) {
    if (reconnect) {
      trackAgencyPartner("agency_reconnect_click", { organizationId: client.organizationId });
    }
    setConnectClient(client);
  }

  function handleRename(client: AgencyClientRow) {
    const next = window.prompt(t("agency.rename"), client.displayName);
    if (!next?.trim() || next.trim() === client.displayName) return;
    renameMutation.mutate({ organizationId: client.organizationId, displayName: next.trim() });
  }

  function handleInvite(client: AgencyClientRow) {
    const email = window.prompt(t("agency.inviteOwnerHint"));
    if (!email?.trim()) return;
    inviteMutation.mutate({ organizationId: client.organizationId, email: email.trim() });
  }

  function handleRemove(client: AgencyClientRow) {
    if (!window.confirm(t("agency.removeConfirm"))) return;
    removeMutation.mutate(client.organizationId);
  }

  const loading = statusLoading || (status?.isAgency && healthLoading);

  const healthCounts = health
    ? {
        live: health.live,
        setup: health.setup,
        token: health.token,
        disconnected: health.disconnected,
      }
    : null;

  function renderClientCard(c: AgencyClientRow, compact = false) {
    const showReconnect = c.needsReconnect || c.connectionStatus === "token";
    const showConnect = !c.whatsappConnected && !showReconnect;
    const showContinueSetup = c.connectionStatus === "setup" && c.whatsappConnected;
    const pendingRename = renameMutation.isPending && renameMutation.variables?.organizationId === c.organizationId;
    const pendingRemove = removeMutation.isPending && removeMutation.variables === c.organizationId;
    const pendingInvite = inviteMutation.isPending && inviteMutation.variables?.organizationId === c.organizationId;

    return (
      <div
        key={c.id}
        className={cn(
          "rounded-2xl border border-border bg-card p-4 elev-1",
          compact && "p-3.5",
        )}
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

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground/80">
            {formatMessage(t("agency.planChip"), { plan: planDisplayName(c.planId, t) })}
          </span>
          {c.trialEndsAt && c.planId === "trial" && (
            <span className="text-xs text-muted-foreground">
              {formatMessage(t("agency.trialEnds"), {
                date: new Date(c.trialEndsAt).toLocaleDateString(),
              })}
            </span>
          )}
        </div>

        {c.whatsappConnected && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
              <span>{t("agency.goLive")}</span>
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

        {c.needsReconnect && (
          <p className="mt-2 text-xs font-medium text-red-700">{t("agency.tokenNeedsRefresh")}</p>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-background px-2.5 py-2">
            <dt className="text-muted-foreground">{t("agency.metricPipeline")}</dt>
            <dd className="font-bold">{formatInr(Math.round(c.openPipelineInr * 100))}</dd>
          </div>
          <div className="rounded-lg bg-background px-2.5 py-2">
            <dt className="text-muted-foreground">{t("agency.metricOpenLeads")}</dt>
            <dd className="font-bold">{c.openLeads}</dd>
          </div>
          <div className="rounded-lg bg-amber-50/80 px-2.5 py-2">
            <dt className="text-muted-foreground">{t("agency.metricHandoffs")}</dt>
            <dd className="font-bold text-amber-900">{c.handoffs}</dd>
          </div>
          <div className="rounded-lg bg-background px-2.5 py-2">
            <dt className="text-muted-foreground">{t("agency.metricUnread")}</dt>
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

          {showReconnect && (
            <Button
              size="sm"
              className="w-full gap-1.5 rounded-xl"
              onClick={() => openConnectDialog(c, true)}
            >
              <Wifi className="h-3.5 w-3.5" />
              {t("agency.reconnectMeta")}
            </Button>
          )}

          {showConnect && (
            <Button
              size="sm"
              className="w-full gap-1.5 rounded-xl"
              onClick={() => openConnectDialog(c, false)}
            >
              <Wifi className="h-3.5 w-3.5" />
              {t("agency.connectMeta")}
            </Button>
          )}

          {showContinueSetup && (
            <Button
              size="sm"
             
              className="w-full gap-1.5 rounded-xl"
              disabled={switchingId === c.organizationId}
              onClick={() => void switchToClient(c.organizationId, "/onboarding?from=agency")}
            >
              {t("agency.continueSetup")}
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 flex-1 gap-1 rounded-xl text-xs"
              disabled={pendingRename}
              onClick={() => handleRename(c)}
            >
              {pendingRename ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Pencil className="h-3 w-3" />
              )}
              {t("agency.rename")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 flex-1 gap-1 rounded-xl text-xs"
              disabled={pendingInvite}
              onClick={() => handleInvite(c)}
            >
              {pendingInvite ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mail className="h-3 w-3" />
              )}
              {t("agency.inviteOwner")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 flex-1 gap-1 rounded-xl text-xs text-destructive hover:text-destructive"
              disabled={pendingRemove}
              onClick={() => handleRemove(c)}
            >
              {pendingRemove ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {t("agency.remove")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <h3 className="mt-4 text-lg font-bold">{t("common.enableAgency")}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {status?.canEnableAgency ? t("agency.enableHint") : t("agency.proRequired")}
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
                {t("common.enableAgency")}
              </Button>
            ) : (
              <Button className="mt-4 rounded-xl" asChild>
                <Link href="/dashboard/pricing?plan=pro">
                  Upgrade to Operator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-3 gap-1.5 rounded-xl text-muted-foreground"
            >
              <Link href="/dashboard/partner">
                <BookOpen className="h-3.5 w-3.5" />
                {t("agency.installKitCta")}
              </Link>
            </Button>
          </div>
        </DashboardPanel>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {formatMessage(t("agency.slotUsage"), {
                used: status.clientCount,
                limit: status.clientLimit,
              })}
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-background px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t("agency.installKitTitle")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("agency.installKitBody")}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 rounded-xl">
                <Link href="/dashboard/partner">
                  {t("agency.installKitCta")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {health && (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("agency.rollupTitle")}
              </p>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ["rollupPipeline", formatInr(Math.round(health.openPipelineInr * 100))],
                    ["rollupHandoffs", health.handoffs],
                    ["rollupUnread", health.unreadMessages],
                    ["rollupLive", health.live],
                  ] as const
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <p className="text-xs text-muted-foreground">{t(`agency.${key}`)}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {healthCounts && clients.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-4">
              {(
                [
                  ["live", "healthLive", healthCounts.live],
                  ["setup", "healthSetup", healthCounts.setup],
                  ["token", "healthReconnect", healthCounts.token],
                  ["disconnected", "healthDisconnected", healthCounts.disconnected],
                ] as const
              ).map(([statusKey, labelKey, count]) => (
                <div
                  key={statusKey}
                  className="rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{t(`agency.${labelKey}`)}</p>
                    <AgencyConnectionBadge status={statusKey} />
                  </div>
                  <p className="mt-1 text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}

          {attentionClients.length > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <h3 className="text-sm font-bold text-amber-950">{t("agency.attentionTitle")}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {attentionClients.map((c) => (
                  <div
                    key={`attention-${c.id}`}
                    className="rounded-xl border border-amber-200/60 bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{c.displayName}</p>
                        <AgencyConnectionBadge status={c.connectionStatus} className="mt-1" />
                        {c.needsReconnect && (
                          <p className="mt-1.5 text-xs text-red-700">{t("agency.tokenNeedsRefresh")}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.connectionStatus === "setup" && c.whatsappConnected && (
                        <Button
                          size="sm"
                         
                          className="h-8 gap-1.5 rounded-xl"
                          disabled={switchingId === c.organizationId}
                          onClick={() =>
                            void switchToClient(c.organizationId, "/onboarding?from=agency")
                          }
                        >
                          {t("agency.continueSetup")}
                        </Button>
                      )}
                      {(c.needsReconnect ||
                        c.connectionStatus === "token" ||
                        !c.whatsappConnected) && (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 rounded-xl"
                          onClick={() =>
                            openConnectDialog(
                              c,
                              c.needsReconnect || c.connectionStatus === "token",
                            )
                          }
                        >
                          <Wifi className="h-3.5 w-3.5" />
                          {c.needsReconnect || c.connectionStatus === "token"
                            ? t("agency.reconnectMeta")
                            : t("agency.connectMeta")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 rounded-xl"
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-end justify-end gap-3">
            <Input
              placeholder={t("common.addClient")}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="h-9 w-48 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientName.trim() && !createMutation.isPending) {
                  createMutation.mutate(clientName.trim());
                }
              }}
            />
            <Button
              size="sm"
              className="gap-1.5 rounded-xl"
              disabled={!clientName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(clientName.trim())}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {t("common.addClient")}
            </Button>
          </div>

          {!clients.length ? (
            <DashboardPanel>
              <EmptyState
                compact
                title={t("agency.empty")}
                description={t("agency.emptyHint")}
              />
            </DashboardPanel>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => renderClientCard(c))}
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        {t("agency.footerNote")}{" "}
        <Link href="/dashboard/partner" className="font-semibold text-accent hover:underline">
          {t("agency.installKitCta")} →
        </Link>{" "}
        ·{" "}
        <Link href="/dashboard/pricing" className="font-semibold text-accent hover:underline">
          Operator plan →
        </Link>
      </p>

      {connectClient && (
        <AgencyClientConnectDialog
          clientOrganizationId={connectClient.organizationId}
          clientName={connectClient.displayName}
          open={!!connectClient}
          onOpenChange={(open) => {
            if (!open) setConnectClient(null);
          }}
        />
      )}
    </div>
  );
}
