"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgencyClientManualConnect } from "@/components/dashboard/agency-client-manual-connect";
import { WhatsappConnectPathPicker } from "@/components/settings/whatsapp-connect-path-picker";
import { WhatsappEmbeddedSignupDiagnostics } from "@/components/settings/whatsapp-embedded-signup-diagnostics";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { runEmbeddedSignup } from "@/lib/facebook-sdk";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import {
  connectMethodForPath,
  DEFAULT_WHATSAPP_CONNECT_PATH,
  WHATSAPP_CONNECT_PATHS,
  type WhatsappConnectPath,
} from "@/lib/whatsapp-connect-paths";
import { useAuthStore } from "@/stores/auth-store";

type ConnectPhase = "idle" | "waiting_meta" | "saving" | "done" | "error";

interface EmbeddedConfig {
  enabled: boolean;
  embeddedSignupLive: boolean;
  appId: string;
  configId: string;
  graphApiVersion: string;
  solutionId?: string;
  featureType?: string;
  coexFeatureType?: string;
}

export function AgencyClientConnectDialog({
  clientOrganizationId,
  clientName,
  open,
  onOpenChange,
}: {
  clientOrganizationId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [connectPath, setConnectPath] = useState<WhatsappConnectPath>(DEFAULT_WHATSAPP_CONNECT_PATH);
  const [phase, setPhase] = useState<ConnectPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showTokenFallback, setShowTokenFallback] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setError(null);
    setConnectPath(DEFAULT_WHATSAPP_CONNECT_PATH);
    setShowTokenFallback(false);
  }, [open, clientOrganizationId]);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["embedded-signup-config"],
    queryFn: () =>
      apiFetch<EmbeddedConfig>("/whatsapp-accounts/embedded-signup/config", {
        token: token ?? undefined,
      }),
    enabled: !!token && open,
    staleTime: 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: (payload: {
      code: string;
      phoneNumberId: string;
      wabaId: string;
      finishEvent: string;
      connectMethod: "embedded" | "embedded_coex";
    }) =>
      apiFetch(`/agency/clients/${clientOrganizationId}/embedded-signup/complete`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          code: payload.code,
          phoneNumberId: payload.phoneNumberId,
          wabaId: payload.wabaId,
          finishEvent: payload.finishEvent,
          connectMethod: payload.connectMethod,
        }),
      }),
    onSuccess: () => {
      setPhase("done");
      setError(null);
      invalidateWorkspaceShellCache(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["agency-clients-health"] });
    },
    onError: (e) => {
      setPhase("error");
      setError(toUserMessage(e, t("agency.connect.tokenError")));
    },
  });

  async function handleFacebookConnect() {
    if (!config?.enabled || !config.embeddedSignupLive) return;
    setError(null);
    setPhase("waiting_meta");

    const pathConfig = WHATSAPP_CONNECT_PATHS[connectPath];
    const featureType =
      config.featureType?.trim() ||
      (connectPath === "business_app"
        ? config.coexFeatureType ?? pathConfig.featureType
        : pathConfig.featureType);

    try {
      const credentials = await runEmbeddedSignup(
        config.appId,
        config.configId,
        config.graphApiVersion,
        { featureType, solutionId: config.solutionId },
      );

      if (!credentials) {
        setPhase("idle");
        return;
      }

      setPhase("saving");
      completeMutation.mutate({
        code: credentials.code,
        phoneNumberId: credentials.phoneNumberId,
        wabaId: credentials.wabaId,
        finishEvent: credentials.finishEvent,
        connectMethod: connectMethodForPath(connectPath),
      });
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Could not open Facebook setup.");
    }
  }

  function handleClose() {
    if (phase === "waiting_meta" || phase === "saving") return;
    onOpenChange(false);
  }

  const embeddedLive = config?.embeddedSignupLive ?? false;
  const embeddedEnabled = embeddedLive && !!config?.enabled;
  const busy = phase === "waiting_meta" || phase === "saving";

  const metaCtaLabel =
    phase === "waiting_meta"
      ? t("agency.connect.waitingMeta")
      : phase === "saving"
        ? t("agency.connect.saving")
        : phase === "error"
          ? t("agency.connect.tryAgain")
          : t("agency.connect.continueFacebook");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent size="lg" showClose={!busy}>
        <DialogHeader>
          <DialogTitle>
            {formatMessage(t("agency.connect.title"), { name: clientName })}
          </DialogTitle>
          <DialogDescription>{t("agency.connect.subtitle")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {phase === "done" ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-whatsapp">
                {formatMessage(t("agency.connect.done"), { name: clientName })}
              </p>
              <Button onClick={handleClose}>{t("agency.connect.doneBtn")}</Button>
            </div>
          ) : configLoading ? (
            <div className="flex items-center justify-center py-12" aria-busy="true">
              <GrowvisiSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <p>{error}</p>
                  {(error.toLowerCase().includes("business") ||
                    error.toLowerCase().includes("waba") ||
                    error.toLowerCase().includes("timed out") ||
                    error.toLowerCase().includes("cancelled")) && (
                    <p className="mt-2 text-xs text-destructive/90">
                      {t("agency.connect.errorHint")}
                    </p>
                  )}
                </div>
              )}

              {embeddedEnabled ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border bg-background px-5 py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-meta-blue-subtle text-meta-blue">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-meta-blue">{t("agency.connect.recommended")}</p>
                        <h3 className="text-base font-semibold">{t("agency.connect.metaCardTitle")}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("agency.connect.metaCardBody")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 px-5 py-5">
                    <WhatsappConnectPathPicker value={connectPath} onChange={setConnectPath} />

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { icon: Smartphone, title: t("agency.connect.step1Title"), text: t("agency.connect.step1Body") },
                        { icon: ShieldCheck, title: t("agency.connect.step2Title"), text: t("agency.connect.step2Body") },
                        { icon: MessageCircle, title: t("agency.connect.step3Title"), text: t("agency.connect.step3Body") },
                      ].map((step, i) => (
                        <div key={step.title} className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs font-bold text-primary">
                            {formatMessage(t("agency.connect.stepLabel"), { n: String(i + 1) })}
                          </p>
                          <step.icon className="mb-1 mt-2 h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.text}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="h-12 w-full gap-2 rounded-xl bg-meta-blue text-base font-semibold hover:bg-meta-blue-hover"
                      disabled={busy}
                      onClick={() => void handleFacebookConnect()}
                    >
                      {busy ? <GrowvisiSpinner size="sm" /> : null}
                      {metaCtaLabel}
                    </Button>

                    <p className="text-xs text-muted-foreground">{t("agency.connect.metaFinishHint")}</p>
                    <WhatsappEmbeddedSignupDiagnostics />

                    <button
                      type="button"
                      className="text-xs font-semibold text-accent hover:underline"
                      onClick={() => setShowTokenFallback((v) => !v)}
                    >
                      {showTokenFallback
                        ? t("agency.connect.hideTokenPath")
                        : t("agency.connect.showTokenPath")}
                    </button>

                    {showTokenFallback && (
                      <div className="border-t border-border pt-4">
                        <AgencyClientManualConnect
                          clientOrganizationId={clientOrganizationId}
                          clientName={clientName}
                          onConnected={() => setPhase("done")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t("agency.connect.embeddedNotLive")}</p>
                  <AgencyClientManualConnect
                    clientOrganizationId={clientOrganizationId}
                    clientName={clientName}
                    onConnected={() => setPhase("done")}
                  />
                </div>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
