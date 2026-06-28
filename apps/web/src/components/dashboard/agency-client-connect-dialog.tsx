"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { runEmbeddedSignup } from "@/lib/facebook-sdk";
import {
  connectMethodForPath,
  WHATSAPP_CONNECT_PATHS,
  type WhatsappConnectPath,
} from "@/lib/whatsapp-connect-paths";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

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
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [connectPath, setConnectPath] = useState<WhatsappConnectPath>("cloud_api");
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
      setError(e instanceof ApiError ? e.message : "Connection failed.");
    },
  });

  async function handleConnect() {
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

  if (!open) return null;

  const embeddedLive = config?.embeddedSignupLive ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="agency-connect-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="agency-connect-title" className="text-base font-bold">
              Connect WhatsApp for {clientName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay in your agency hub — links the client number without switching workspaces.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          {phase === "done" ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#128C7E]">
                WhatsApp connected for {clientName}.
              </p>
              <Button className="rounded-xl" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : !embeddedLive || !config?.enabled ? (
            <p className="text-sm text-muted-foreground">
              Embedded Signup is not live yet. Switch into the client workspace and use the Meta API
              Setup token during App Review.
            </p>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(WHATSAPP_CONNECT_PATHS) as WhatsappConnectPath[]).map((pathId) => {
                  const path = WHATSAPP_CONNECT_PATHS[pathId];
                  const selected = connectPath === pathId;
                  return (
                    <button
                      key={pathId}
                      type="button"
                      onClick={() => setConnectPath(pathId)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-xs transition-all",
                        selected
                          ? "border-[#1877F2]/40 bg-[#1877F2]/5"
                          : "border-border/80 hover:border-primary/20",
                      )}
                    >
                      <p className="font-semibold text-foreground">{path.title}</p>
                      <p className="mt-1 text-muted-foreground">{path.description}</p>
                    </button>
                  );
                })}
              </div>

              <Button
                className="h-11 w-full gap-2 rounded-xl bg-[#1877F2] hover:bg-[#166FE0]"
                disabled={phase === "waiting_meta" || phase === "saving"}
                onClick={() => void handleConnect()}
              >
                {(phase === "waiting_meta" || phase === "saving") && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {phase === "waiting_meta"
                  ? "Complete setup in Facebook…"
                  : phase === "saving"
                    ? "Saving to client workspace…"
                    : "Continue with Facebook"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
