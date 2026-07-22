"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Plus,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { UpgradeFrictionBanner } from "@/components/dashboard/upgrade-friction-banner";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { useShellWhatsappAccounts } from "@/hooks/use-shell-data";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { runEmbeddedSignup } from "@/lib/facebook-sdk";
import { WhatsappConnectPathPicker } from "@/components/settings/whatsapp-connect-path-picker";
import {
  connectMethodForPath,
  DEFAULT_WHATSAPP_CONNECT_PATH,
  WHATSAPP_CONNECT_PATHS,
  type WhatsappConnectPath,
} from "@/lib/whatsapp-connect-paths";
import { canConnectWhatsapp } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useToast } from "@/components/ui/toast";
import { WhatsappEmbeddedSignupDiagnostics } from "@/components/settings/whatsapp-embedded-signup-diagnostics";
import { WhatsappConnectionHealth } from "@/components/settings/whatsapp-connection-health";
import { WhatsappGoLiveChecklist } from "@/components/settings/whatsapp-go-live-checklist";
import { WhatsappOnboardingHelp } from "@/components/settings/whatsapp-onboarding-help";

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

export type WhatsappConnectPhase = "idle" | "waiting_meta" | "saving" | "done" | "error";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsappConnect({
  variant = "default",
  onPhaseChange,
}: {
  variant?: "default" | "onboarding";
  /** Fired when Embedded Signup / save phase changes (used by activation progress UI). */
  onPhaseChange?: (phase: WhatsappConnectPhase) => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canConnect = canConnectWhatsapp(role);
  const onboarding = useAuthStore((s) => s.onboarding);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const isOnboarding = variant === "onboarding";
  const [phase, setPhaseState] = useState<WhatsappConnectPhase>("idle");
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;
  const setPhase = (next: WhatsappConnectPhase) => {
    setPhaseState(next);
    onPhaseChangeRef.current?.(next);
  };
  const [error, setError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<WhatsappAccount | null>(null);
  /** Same default as Settings — ES featureType unchanged; no path UI on onboarding. */
  const [connectPath, setConnectPath] = useState<WhatsappConnectPath>(DEFAULT_WHATSAPP_CONNECT_PATH);
  const [addingAnother, setAddingAnother] = useState(false);
  const { t } = useI18n();
  const { success, error: toastError } = useToast();

  const { data: accounts, isLoading: accountsLoading, isError: accountsError, error: accountsErrorObj } =
    useShellWhatsappAccounts<WhatsappAccount[]>({ allowFetchBeforeBootstrap: true });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["embedded-signup-config"],
    queryFn: () => apiFetch<EmbeddedConfig>("/whatsapp-accounts/embedded-signup/config", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: STALE.config,
    placeholderData: (prev) => prev,
  });

  // Only block the connect UI on the first fetch — never replace tabs/input on background refetch.
  const initialConnectLoading =
    (!accounts && accountsLoading) || (!config && configLoading);

  const { data: billing } = useShellBilling<{
    usage: { whatsappNumbers: number };
    limits: { whatsappNumbers: number };
  }>({ allowFetchBeforeBootstrap: true });

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
      success(t("toast.whatsappConnected"));
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: onboarding?.firstMessageReceived ?? false,
        complete: onboarding?.firstMessageReceived ?? false,
      });
      invalidateWorkspaceShellCache(queryClient);
    },
    onError: (e) => {
      setPhase("error");
      setError(toUserMessage(e, "Connection failed. Please try again."));
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/whatsapp-accounts/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => {
      setConnectedAccount(null);
      setPhase("idle");
      success(t("toast.whatsappDisconnected"));
      invalidateWorkspaceShellCache(queryClient);
    },
    onError: (e) => {
      toastError(toUserMessage(e, t("toast.actionFailed")));
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

  if (initialConnectLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-[200px] animate-pulse rounded-2xl border border-border/80 bg-muted/40" />
        <div className="h-24 animate-pulse rounded-2xl border border-border/80 bg-muted/30" />
      </div>
    );
  }

  // Keep this instance mounted during Meta popup + save — parent only hides visually.
  // Returning null here previously risked remount races with postMessage / FB.login.
  if (isOnboarding && displayAccount && !addingAnother && phase !== "waiting_meta" && phase !== "saving") {
    return null;
  }

  const trialBlocked =
    accountsError &&
    accountsErrorObj instanceof ApiError &&
    (accountsErrorObj.status === 402 || accountsErrorObj.status === 403);

  const trialUpgradeBanner = trialBlocked ? (
    <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
      <p className="font-semibold">Upgrade to connect WhatsApp</p>
      <p className="mt-1 text-warning">
        {toUserMessage(
          accountsErrorObj,
          "Your plan needs an upgrade before you can connect a number.",
        )}
      </p>
      <Button asChild size="sm" className="mt-3 rounded-xl">
        <Link href="/dashboard/pricing">View plans</Link>
      </Button>
    </div>
  ) : null;

  if (displayAccount && !addingAnother && phase !== "waiting_meta" && phase !== "saving") {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-accent-light/30 bg-card elev-1 shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
          <div className="border-b border-accent-light/20 bg-bento-mint/50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-whatsapp">
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
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-whatsapp shadow-sm">
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

            <div className="mt-6 border-t border-border pt-6">
              <WhatsappGoLiveChecklist compact showTestMessage={false} />
            </div>
          </div>
        </div>

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
        {canConnect && !canAddNumber && whatsappUsed >= whatsappLimit && (
          <UpgradeFrictionBanner
            className="mt-3"
            compact
            reason="whatsapp"
            message={`Your plan includes ${whatsappLimit} WhatsApp number${whatsappLimit === 1 ? "" : "s"}. Upgrade to connect another line.`}
            limit={whatsappLimit}
            used={whatsappUsed}
            suggestedPlan={whatsappLimit <= 1 ? "growth" : "pro"}
          />
        )}
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="space-y-6">
        {trialUpgradeBanner}
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
          <p className="font-semibold">WhatsApp connect is temporarily unavailable</p>
          <p className="mt-1 text-warning">
            One-click Meta connection is not configured for this workspace yet. Please try again
            shortly or contact support.
          </p>
        </div>
        {!isOnboarding && <WhatsappOnboardingHelp />}
      </div>
    );
  }

  const metaCtaLabel =
    phase === "waiting_meta"
      ? t("onboardingActivation.metaWindowHint")
      : phase === "saving"
        ? t("onboardingActivation.connectingNumber")
        : phase === "error"
          ? t("onboardingActivation.tryAgain")
          : t("onboardingActivation.continueWithMeta");

  const facebookConnectCard = isOnboarding ? (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
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

        {embeddedLive ? (
          <>
            <Button
              size="lg"
              className="h-12 w-full gap-2 bg-meta-blue text-base hover:bg-meta-blue-hover"
              disabled={phase === "waiting_meta" || phase === "saving"}
              onClick={() => void handleConnect()}
            >
              {(phase === "waiting_meta" || phase === "saving") && (
                <GrowvisiSpinner size="sm" />
              )}
              {metaCtaLabel}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {t("onboardingActivation.connectTrust")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("onboardingActivation.metaUnavailable")}</p>
        )}
      </div>
    </div>
  ) : (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgb(11_28_48/0.04)]">
      <div className="border-b border-border bg-background px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-meta-blue-subtle text-meta-blue">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-meta-blue">
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
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>{error}</p>
            {error.toLowerCase().includes("timed out") || error.toLowerCase().includes("cancelled") ? (
              <p className="mt-2 text-xs text-destructive/90">
                Tip: After Facebook login, Meta should show WhatsApp setup screens (pick business →
                phone → Finish). If the popup closes right after login, try the &quot;I use WhatsApp
                API already&quot; path, allow popups, and confirm{" "}
                <code className="rounded bg-destructive/10 px-1">
                  {typeof window !== "undefined" ? window.location.hostname : "your domain"}
                </code>{" "}
                is in Meta → Facebook Login for Business → Allowed Domains.
              </p>
            ) : null}
          </div>
        )}

        {embeddedLive && (
          <>
            <WhatsappConnectPathPicker value={connectPath} onChange={setConnectPath} />

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
              className="h-12 w-full gap-2 rounded-xl bg-meta-blue text-base font-semibold hover:bg-meta-blue-hover"
              disabled={phase === "waiting_meta" || phase === "saving"}
              onClick={() => void handleConnect()}
            >
              {(phase === "waiting_meta" || phase === "saving") && (
                <GrowvisiSpinner size="sm" />
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
              {t("whatsappConnect.secureNote")} {t("whatsappConnect.metaFinishHint")}
            </p>
            <WhatsappEmbeddedSignupDiagnostics />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {trialUpgradeBanner}
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
      {!isOnboarding && (
        <div className="rounded-xl border border-primary/20 bg-background elev-1 px-5 py-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Connect the <strong className="text-foreground">WhatsApp Business number you already use</strong>{" "}
            — the line your customers message. Growvisi ingests conversations for classification,
            pipeline tracking, and team replies from Conversations.
          </p>
        </div>
      )}

      {embeddedLive ? (
        <>
          {canConnect ? (
            facebookConnectCard
          ) : (
            <p className="rounded-xl border border-border/80 bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
              Only workspace admins can connect WhatsApp. Ask an owner or admin to link your business
              line.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {canConnect ? (
            isOnboarding ? (
              facebookConnectCard
            ) : (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
                <p className="font-semibold">Continue with Meta is not live yet</p>
                <p className="mt-1 text-warning">
                  Embedded Signup must be enabled for this environment. Contact support if this
                  persists.
                </p>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Only workspace admins can connect WhatsApp numbers.
            </p>
          )}
          {!isOnboarding && <WhatsappOnboardingHelp />}
        </div>
      )}
    </div>
  );
}
