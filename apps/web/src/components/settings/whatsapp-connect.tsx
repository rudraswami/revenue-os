"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { runEmbeddedSignup } from "@/lib/facebook-sdk";
import {
  connectMethodForPath,
  WHATSAPP_CONNECT_PATHS,
  type WhatsappConnectPath,
} from "@/lib/whatsapp-connect-paths";
import { canConnectWhatsapp } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { WhatsappConnectWizard } from "@/components/settings/whatsapp-connect-wizard";
import { WhatsappConnectionHealth } from "@/components/settings/whatsapp-connection-health";
import { WhatsappGoLiveChecklist } from "@/components/settings/whatsapp-go-live-checklist";
import { WhatsappEmbeddedSignupDiagnostics } from "@/components/settings/whatsapp-embedded-signup-diagnostics";
import { WhatsappOnboardingHelp } from "@/components/settings/whatsapp-onboarding-help";
import { WhatsappTokenRefresh } from "@/components/settings/whatsapp-token-refresh";

interface WhatsappAccount {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  isActive: boolean;
}

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

type ConnectPhase = "idle" | "waiting_meta" | "saving" | "done" | "error";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsappConnect() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canConnect = canConnectWhatsapp(role);
  const onboarding = useAuthStore((s) => s.onboarding);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<ConnectPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<WhatsappAccount | null>(null);
  const [connectPath, setConnectPath] = useState<WhatsappConnectPath>("cloud_api");
  const [addingAnother, setAddingAnother] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<WhatsappAccount[]>("/whatsapp-accounts", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["embedded-signup-config"],
    queryFn: () => apiFetch<EmbeddedConfig>("/whatsapp-accounts/embedded-signup/config", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: readiness } = useQuery({
    queryKey: ["whatsapp-onboarding-readiness"],
    queryFn: () =>
      apiFetch<{ metaApiSetupUrl: string }>("/whatsapp-accounts/onboarding-readiness", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: connectionHealth } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<{
        tokenHealth?: {
          valid: boolean;
          level?: "ok" | "soon" | "urgent";
          needsRefresh: boolean;
          needsAttention?: boolean;
          hoursRemaining: number | null;
          expiresAt: string | null;
        };
      }>("/whatsapp-accounts/connection-health", { token: token ?? undefined }),
    enabled: !!token && (accounts?.some((a) => a.isActive) ?? false),
    staleTime: 30_000,
  });

  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () =>
      apiFetch<{ usage: { whatsappNumbers: number }; limits: { whatsappNumbers: number } }>(
        "/billing",
        { token: token ?? undefined },
      ),
    enabled: !!token,
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
      apiFetch<WhatsappAccount>("/whatsapp-accounts/embedded-signup/complete", {
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
    onSuccess: (account) => {
      setConnectedAccount(account);
      setPhase("done");
      setError(null);
      setAddingAnother(false);
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: onboarding?.firstMessageReceived ?? false,
        complete: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-status"] });
    },
    onError: (e) => {
      setPhase("error");
      setError(e instanceof ApiError ? e.message : "Connection failed. Please try again.");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/whatsapp-accounts/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => {
      setConnectedAccount(null);
      setPhase("idle");
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not disconnect.");
    },
  });

  const activeAccounts = accounts?.filter((a) => a.isActive) ?? [];
  const displayAccount = connectedAccount ?? activeAccounts[0] ?? null;
  const embeddedLive = config?.embeddedSignupLive ?? false;
  const whatsappLimit = billing?.limits.whatsappNumbers ?? 1;
  const whatsappUsed = billing?.usage.whatsappNumbers ?? activeAccounts.length;
  const canAddNumber = canConnect && whatsappUsed < whatsappLimit;

  async function handleConnect() {
    if (!config?.enabled || !embeddedLive) return;
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
      const msg = e instanceof Error ? e.message : "Could not open Facebook setup.";
      setError(msg);
    }
  }

  if (accountsLoading || configLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-[200px] animate-pulse rounded-2xl border border-border/80 bg-muted/40" />
        <div className="h-24 animate-pulse rounded-2xl border border-border/80 bg-muted/30" />
      </div>
    );
  }

  if (displayAccount && !addingAnother && phase !== "waiting_meta" && phase !== "saving") {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-[#6cf8bb]/30 bg-gradient-to-br from-[#ecfdf5]/80 via-white to-white shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
          <div className="border-b border-[#6cf8bb]/20 bg-[#ecfdf5]/50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#128C7E]">
                <CheckCircle2 className="h-4 w-4" />
                WhatsApp connected
              </p>
              <p className="text-xs text-muted-foreground">
                {whatsappUsed} / {whatsappLimit} number{whatsappLimit === 1 ? "" : "s"} on plan
              </p>
            </div>
          </div>
          <div className="p-6 md:p-8">
            {activeAccounts.length > 1 ? (
              <ul className="mb-6 space-y-2">
                {activeAccounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#dce9ff] bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {account.verifiedName ?? "Business line"}
                      </p>
                      <p className="text-sm text-muted-foreground">{account.displayPhoneNumber}</p>
                    </div>
                    {canConnect && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        disabled={disconnectMutation.isPending}
                        onClick={() => {
                          if (confirm(`Disconnect ${account.displayPhoneNumber}?`)) {
                            disconnectMutation.mutate(account.id);
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E] shadow-sm">
                  <WhatsAppIcon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    {displayAccount.verifiedName ?? "Your business line"}
                  </h2>
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                    {displayAccount.displayPhoneNumber}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Customers can keep messaging this number. Growvisi syncs every conversation for
                    scoring, pipeline, and team replies from Conversations.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-[#dce9ff] pt-6">
              <WhatsappGoLiveChecklist compact showTestMessage={false} />
            </div>
          </div>
        </div>

        <WhatsappTokenRefresh
          accountId={displayAccount.id}
          metaApiSetupUrl={readiness?.metaApiSetupUrl ?? "https://developers.facebook.com/apps/"}
          level={connectionHealth?.tokenHealth?.level}
          needsRefresh={connectionHealth?.tokenHealth?.needsRefresh}
          needsAttention={connectionHealth?.tokenHealth?.needsAttention}
          hoursRemaining={connectionHealth?.tokenHealth?.hoursRemaining}
          expiresAt={connectionHealth?.tokenHealth?.expiresAt}
        />

        <WhatsappConnectionHealth />

        <div className="flex flex-wrap gap-2">
          {canAddNumber && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl"
              onClick={() => {
                setConnectedAccount(null);
                setAddingAnother(true);
                setPhase("idle");
                setError(null);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add another number
            </Button>
          )}
          {canConnect && activeAccounts.length === 1 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-muted-foreground"
              disabled={disconnectMutation.isPending}
              onClick={() => {
                if (confirm(`Disconnect ${displayAccount.displayPhoneNumber}?`)) {
                  disconnectMutation.mutate(displayAccount.id);
                }
              }}
            >
              Disconnect number
            </Button>
          )}
        </div>
        {!canConnect && (
          <p className="text-sm text-muted-foreground">
            Only workspace admins can connect or disconnect WhatsApp numbers.
          </p>
        )}
        {canConnect && !canAddNumber && whatsappUsed >= whatsappLimit && whatsappLimit === 1 && (
          <p className="text-sm text-muted-foreground">
            Your plan includes 1 WhatsApp number.{" "}
            <Link href="/dashboard/pricing" className="font-medium text-accent hover:underline">
              Upgrade to Growth
            </Link>{" "}
            for up to 3 lines.
          </p>
        )}
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary-soft/40 to-[#25D366]/5 px-5 py-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Connect your <strong className="text-foreground">WhatsApp Business number</strong> with a
            Meta API Setup token. Growvisi ingests messages, classifies intent, and tracks pipeline — your
            team replies from Inbox when customers need a human.
          </p>
        </div>
        {canConnect ? (
          <WhatsappConnectWizard />
        ) : (
          <p className="text-sm text-muted-foreground">
            Only workspace admins can connect WhatsApp. You can view connection status once a number
            is linked.
          </p>
        )}
        <WhatsappOnboardingHelp />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {addingAnother && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Adding another WhatsApp line ({whatsappUsed}/{whatsappLimit} used)
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAddingAnother(false);
              setPhase("idle");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary-soft/40 to-[#25D366]/5 px-5 py-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Connect the <strong className="text-foreground">WhatsApp Business number you already use</strong>{" "}
          — the line your customers message. Growvisi ingests conversations for classification,
          pipeline tracking, and team replies from Conversations.
        </p>
      </div>

      {embeddedLive ? (
        <>
        {canConnect ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-gradient-to-r from-[#1877F2]/10 via-primary/5 to-[#25D366]/10 px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1877F2]/15 text-[#1877F2]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1877F2]">
                  Recommended
                </p>
                <h3 className="text-lg font-semibold">One-click with Facebook</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in with the Facebook account that manages your WhatsApp Business. Takes about
                  2 minutes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6">
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">How do you use WhatsApp today?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(WHATSAPP_CONNECT_PATHS) as WhatsappConnectPath[]).map((pathId) => {
                  const path = WHATSAPP_CONNECT_PATHS[pathId];
                  const selected = connectPath === pathId;
                  return (
                    <button
                      key={pathId}
                      type="button"
                      onClick={() => setConnectPath(pathId)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-[#1877F2]/40 bg-[#1877F2]/5 ring-1 ring-[#1877F2]/20"
                          : "border-border/80 bg-white hover:border-primary/20",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{path.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {path.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Smartphone, title: "Business account", text: "Use your Meta Business login" },
                { icon: ShieldCheck, title: "Pick your number", text: "Select your WhatsApp line" },
                { icon: MessageCircle, title: "Go live", text: "Messages flow to Inbox" },
              ].map((step, i) => (
                <div key={step.title} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold text-primary">Step {i + 1}</p>
                  <step.icon className="mb-1 mt-2 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className={cn(
                "h-12 w-full max-w-md gap-2 text-base font-semibold",
                "bg-[#1877F2] hover:bg-[#166FE0]",
              )}
              disabled={phase === "waiting_meta" || phase === "saving"}
              onClick={() => void handleConnect()}
            >
              {(phase === "waiting_meta" || phase === "saving") && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {phase === "waiting_meta"
                ? "Complete setup in the Facebook window…"
                : phase === "saving"
                  ? "Connecting your number…"
                  : phase === "error"
                    ? "Try again"
                    : "Continue with Facebook"}
            </Button>

            <p className="text-xs text-muted-foreground">
              Secure connection powered by Meta. Growvisi never sees your Facebook password.
            </p>
            <WhatsappEmbeddedSignupDiagnostics />
          </div>
        </div>
        ) : (
          <p className="rounded-xl border border-border/80 bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
            Only workspace admins can connect WhatsApp. Ask an owner or admin to link your business
            line.
          </p>
        )}

        {canConnect && (
        <details className="rounded-2xl border border-border/80 bg-white">
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground">
            During App Review: connect with Meta API Setup token
          </summary>
          <div className="border-t border-border/80 px-6 py-6">
            <WhatsappConnectWizard />
          </div>
        </details>
        )}
        </>
      ) : (
        <>
          {canConnect ? (
            <WhatsappConnectWizard />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only workspace admins can connect WhatsApp numbers.
            </p>
          )}

          <WhatsappOnboardingHelp />
        </>
      )}
    </div>
  );
}
