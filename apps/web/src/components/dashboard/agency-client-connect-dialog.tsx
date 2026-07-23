"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { runEmbeddedSignup } from "@/lib/facebook-sdk";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import {
  connectMethodForPath,
  DEFAULT_WHATSAPP_CONNECT_PATH,
  WHATSAPP_CONNECT_PATHS,
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
  const [phase, setPhase] = useState<ConnectPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showTokenFallback, setShowTokenFallback] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setError(null);
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

    const connectPath = DEFAULT_WHATSAPP_CONNECT_PATH;
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
      ? t("onboardingActivation.metaWindowHint")
      : phase === "saving"
        ? t("onboardingActivation.connectingNumber")
        : phase === "error"
          ? t("onboardingActivation.tryAgain")
          : t("onboardingActivation.continueWithMeta");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent size="md" showClose={!busy}>
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
            <div className="space-y-4">
              {embeddedEnabled ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
                  <div className="space-y-5 p-6 sm:p-8">
                    {error && (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <p>{error}</p>
                        {(error.toLowerCase().includes("timed out") ||
                          error.toLowerCase().includes("cancelled") ||
                          error.toLowerCase().includes("popup") ||
                          error.toLowerCase().includes("facebook")) && (
                          <p className="mt-2 text-xs text-destructive/90">
                            {t("onboardingActivation.connectErrorHint")}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="h-12 w-full gap-2 bg-meta-blue text-base hover:bg-meta-blue-hover"
                      disabled={busy}
                      onClick={() => void handleFacebookConnect()}
                    >
                      {busy && <GrowvisiSpinner size="sm" />}
                      {metaCtaLabel}
                    </Button>
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      {t("onboardingActivation.connectTrust")}
                    </p>
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

              {embeddedEnabled && (
                <>
                  <button
                    type="button"
                    className="w-full text-center text-xs font-semibold text-accent hover:underline"
                    onClick={() => setShowTokenFallback((v) => !v)}
                  >
                    {showTokenFallback
                      ? t("agency.connect.hideTokenPath")
                      : t("agency.connect.showTokenPath")}
                  </button>
                  {showTokenFallback && (
                    <AgencyClientManualConnect
                      clientOrganizationId={clientOrganizationId}
                      clientName={clientName}
                      onConnected={() => setPhase("done")}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
