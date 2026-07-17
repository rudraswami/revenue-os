"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { WhatsappIngestionVerifier } from "@/components/settings/whatsapp-ingestion-verifier";
import { WhatsappMetaSetupGuide } from "@/components/settings/whatsapp-meta-setup-guide";
import { WhatsappOnboardingFaq } from "@/components/settings/whatsapp-onboarding-faq";
import { WhatsappPhonePicker } from "@/components/settings/whatsapp-phone-picker";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  looksLikeMetaToken,
  normalizeMetaToken,
  WIZARD_STEP_KEY,
  WIZARD_TOKEN_DRAFT_KEY,
  WIZARD_STEPS,
  type DiscoveredPhone,
  type WhatsappAccountSummary,
  type WizardStepId,
} from "@/lib/whatsapp-onboarding";
import { cn } from "@/lib/utils";

type QuickConnectResult = {
  account: WhatsappAccountSummary;
  discovered: DiscoveredPhone[];
  autoSelected: boolean;
};

function unwrapQuickConnect(res: unknown): QuickConnectResult | null {
  if (!res || typeof res !== "object") return null;
  const row = res as Record<string, unknown>;
  if (row.account && typeof row.account === "object" && "id" in (row.account as object)) {
    return res as QuickConnectResult;
  }
  if ("id" in row && "displayPhoneNumber" in row) {
    return {
      account: res as WhatsappAccountSummary,
      discovered: [],
      autoSelected: false,
    };
  }
  return null;
}

export function WhatsappConnectWizard({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const onboarding = useAuthStore((s) => s.onboarding);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState<WizardStepId>("connect");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredPhone[]>([]);
  const [connected, setConnected] = useState<WhatsappAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastAutoDiscover = useRef("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(WIZARD_STEP_KEY) as WizardStepId | "prepare" | null;
    // verify step needs in-memory connected state — never restore it from storage alone.
    if (saved === "verify" || saved === "prepare") {
      setStep("connect");
      sessionStorage.setItem(WIZARD_STEP_KEY, "connect");
    } else if (saved && WIZARD_STEPS.some((s) => s.id === saved)) {
      setStep(saved);
    }
    const draft = sessionStorage.getItem(WIZARD_TOKEN_DRAFT_KEY);
    if (draft) setAccessToken(normalizeMetaToken(draft));
  }, []);

  useEffect(() => {
    sessionStorage.setItem(WIZARD_STEP_KEY, step);
    if (step === "verify" && connected) {
      sessionStorage.removeItem(WIZARD_STEP_KEY);
      sessionStorage.removeItem(WIZARD_TOKEN_DRAFT_KEY);
    }
  }, [step, connected]);

  useEffect(() => {
    if (!accessToken.trim()) {
      sessionStorage.removeItem(WIZARD_TOKEN_DRAFT_KEY);
      return;
    }
    sessionStorage.setItem(WIZARD_TOKEN_DRAFT_KEY, accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const { data: readiness } = useQuery({
    queryKey: ["whatsapp-onboarding-readiness"],
    queryFn: () =>
      apiFetch<{ ready: boolean; metaApiSetupUrl: string }>(
        "/whatsapp-accounts/onboarding-readiness",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 60_000,
  });

  const metaApiSetupUrl = readiness?.metaApiSetupUrl ?? "https://developers.facebook.com/apps/";

  const discoverMutation = useMutation({
    mutationFn: () =>
      apiFetch<DiscoveredPhone[]>("/whatsapp-accounts/discover-phones", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ accessToken: normalizeMetaToken(accessToken) }),
      }),
    onSuccess: (phones) => {
      setDiscovered(phones);
      setError(null);
      if (phones.length === 1) {
        setPhoneNumberId(phones[0].phoneNumberId);
        setWabaId(phones[0].wabaId);
      } else if (phones.length > 1 && !phones.some((p) => p.phoneNumberId === phoneNumberId)) {
        setPhoneNumberId(phones[0].phoneNumberId);
        setWabaId(phones[0].wabaId);
      }
    },
    onError: (e) => {
      setDiscovered([]);
      setError(toUserMessage(e, "Could not find a number on this token."));
    },
  });

  const quickConnectMutation = useMutation({
    mutationFn: () =>
      apiFetch<QuickConnectResult>("/whatsapp-accounts/quick-connect", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          accessToken: normalizeMetaToken(accessToken),
          phoneNumberId: phoneNumberId.trim() || undefined,
          wabaId: wabaId.trim() || undefined,
        }),
      }),
    onSuccess: (res) => {
      const parsed = unwrapQuickConnect(res);
      if (!parsed?.account?.id) {
        const msg = "Connection succeeded but the response was unexpected. Refresh and check Settings → WhatsApp.";
        setError(msg);
        toastError(msg);
        return;
      }
      setConnected(parsed.account);
      if (parsed.discovered.length > 0) setDiscovered(parsed.discovered);
      setError(null);
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: onboarding?.firstMessageReceived ?? false,
        complete: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-connection-health"] });
      setStep("verify");
      toastSuccess("WhatsApp number connected");
      onConnected?.();
    },
    onError: (e) => {
      const msg = toUserMessage(e, "Connection failed. Check your token and try again.");
      setError(msg);
      toastError(msg);
    },
  });

  const connecting = quickConnectMutation.isPending;
  const needsPhonePick = discovered.length > 1;
  const tokenReady = looksLikeMetaToken(accessToken);
  const canConnect =
    tokenReady && (!needsPhonePick || phoneNumberId.trim().length > 5);
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  const connectHint = (() => {
    if (!tokenReady) {
      const normalized = normalizeMetaToken(accessToken);
      if (!normalized) return "Paste your access token from Meta API Setup to continue.";
      if (!/^EAA/i.test(normalized)) {
        return "Token should start with EAA — copy it from Meta API Setup → Generate access token.";
      }
      return "Token looks incomplete — copy the full string from Meta (usually 100+ characters).";
    }
    if (needsPhonePick && !phoneNumberId.trim()) {
      return "Select which business line to connect.";
    }
    return null;
  })();

  const runDiscover = useCallback(() => {
    if (!looksLikeMetaToken(accessToken)) return;
    discoverMutation.mutate();
  }, [accessToken, discoverMutation]);

  useEffect(() => {
    const trimmed = normalizeMetaToken(accessToken);
    if (!looksLikeMetaToken(trimmed) || trimmed === lastAutoDiscover.current) return;
    if (discoverMutation.isPending) return;

    const timer = setTimeout(() => {
      lastAutoDiscover.current = trimmed;
      runDiscover();
    }, 600);

    return () => clearTimeout(timer);
  }, [accessToken, discoverMutation.isPending, runDiscover]);

  function applyToken(raw: string) {
    const normalized = normalizeMetaToken(raw);
    if (!normalized) return;
    lastAutoDiscover.current = "";
    setAccessToken(normalized);
    setError(null);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        applyToken(text);
        return;
      }
      setError("Clipboard is empty. Copy your token from Meta API Setup first.");
    } catch {
      setError("Could not read clipboard — click the field and press Ctrl+V (or ⌘V on Mac).");
    }
  }

  function handleTokenPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.trim()) return;
    e.preventDefault();
    applyToken(text);
  }

  function handleTokenBlur() {
    const normalized = normalizeMetaToken(accessToken);
    if (normalized && normalized !== accessToken) {
      setAccessToken(normalized);
    }
  }

  function handleConnect() {
    if (!canConnect || connecting) return;
    setError(null);
    quickConnectMutation.mutate();
  }

  function selectPhone(phone: DiscoveredPhone) {
    setPhoneNumberId(phone.phoneNumberId);
    setWabaId(phone.wabaId);
    setError(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
      <div className="border-b border-border bg-background px-6 py-5">
        <p className="text-xs font-medium text-accent">
          Connect WhatsApp
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
          Paste one token — we handle the rest
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your existing business number. Growvisi syncs conversations for pipeline and AI
          insights.
        </p>

        <div className="mt-5 flex gap-4">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  i < stepIndex
                    ? "bg-accent text-white"
                    : i === stepIndex
                      ? "bg-primary text-white shadow-md"
                      : "bg-border text-muted-foreground",
                )}
              >
                {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  i === stepIndex ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.title}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <div className="ml-2 hidden h-px w-8 bg-border sm:block" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {step === "connect" && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <WhatsappMetaSetupGuide metaApiSetupUrl={metaApiSetupUrl} />

              <div className="flex flex-col rounded-2xl border border-border bg-background/40 p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="wa-access-token" className="text-sm font-semibold text-foreground">
                      Paste access token
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => void pasteFromClipboard()}
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      Paste
                    </Button>
                  </div>
                  <Input
                    id="wa-access-token"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="EAA… — paste from Meta API Setup"
                    className="font-mono"
                    value={accessToken}
                    onPaste={handleTokenPaste}
                    onBlur={handleTokenBlur}
                    onChange={(e) => {
                      setAccessToken(e.target.value);
                      setError(null);
                    }}
                  />
                  {discoverMutation.isPending && (
                    <p className="flex items-center gap-2 text-xs text-accent">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Finding your business number…
                    </p>
                  )}
                  {discovered.length === 1 && !discoverMutation.isPending && (
                    <p className="flex items-center gap-1.5 text-xs text-whatsapp">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Found {discovered[0].displayPhoneNumber}
                      {discovered[0].verifiedName ? ` · ${discovered[0].verifiedName}` : ""}
                    </p>
                  )}
                </div>

                {needsPhonePick && (
                  <div className="mt-4">
                    <WhatsappPhonePicker
                      phones={discovered}
                      selectedId={phoneNumberId}
                      onSelect={selectPhone}
                    />
                  </div>
                )}

                <Button
                  type="button"
                  disabled={connecting || !canConnect}
                 
                  size="lg"
                  className="mt-5 h-12 w-full rounded-xl text-sm font-semibold"
                  onClick={handleConnect}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      Connect my number
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {connectHint && !connecting && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">{connectHint}</p>
                )}

                <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                  Encrypted on our servers. We verify your token, enable webhooks, and link your
                  number in one step.
                </p>
              </div>
            </div>

            <WhatsappOnboardingFaq />
          </>
        )}

        {step === "verify" && connected && (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-accent-light/40 bg-bento-mint/60 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-whatsapp" />
              <div>
                <p className="font-semibold text-foreground">Number connected</p>
                <p className="text-lg font-bold">
                  {connected.verifiedName ?? connected.displayPhoneNumber}
                </p>
                <p className="text-sm text-muted-foreground">{connected.displayPhoneNumber}</p>
              </div>
            </div>

            <WhatsappIngestionVerifier displayPhoneNumber={connected.displayPhoneNumber} />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-background/50 px-6 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
        Meta-compliant · Tokens encrypted · One-click Facebook connect after App Review
      </div>
    </div>
  );
}
