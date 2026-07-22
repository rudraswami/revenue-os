"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { runEmbeddedSignup } from "@/lib/facebook-sdk";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { WhatsappConnectPathPicker } from "@/components/settings/whatsapp-connect-path-picker";
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

  const { data: config } = useQuery({
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
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setPhase("done");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["agency-clients"] });
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
        ...credentials,
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
    setPhase("idle");
    setError(null);
  }

  const embeddedLive = config?.embeddedSignupLive ?? false;
  const busy = phase === "waiting_meta" || phase === "saving";

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
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!embeddedLive || !config?.enabled ? (
                <p className="text-sm text-muted-foreground">{t("agency.connect.embeddedNotLive")}</p>
              ) : (
                <>
                  <WhatsappConnectPathPicker value={connectPath} onChange={setConnectPath} />

                  <Button
                    className="h-11 w-full gap-2 bg-meta-blue hover:bg-meta-blue-hover"
                    disabled={busy}
                    onClick={() => void handleFacebookConnect()}
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {phase === "waiting_meta"
                      ? t("agency.connect.waitingMeta")
                      : phase === "saving"
                        ? t("agency.connect.saving")
                        : t("agency.connect.continueFacebook")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("agency.connect.metaFinishHint")}</p>
                </>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
