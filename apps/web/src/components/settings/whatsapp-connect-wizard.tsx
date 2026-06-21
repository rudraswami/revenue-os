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
import { WhatsappIngestionVerifier } from "@/components/settings/whatsapp-ingestion-verifier";
import { WhatsappMetaSetupGuide } from "@/components/settings/whatsapp-meta-setup-guide";
import { WhatsappOnboardingFaq } from "@/components/settings/whatsapp-onboarding-faq";
import { WhatsappPhonePicker } from "@/components/settings/whatsapp-phone-picker";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  looksLikeMetaToken,
  WIZARD_STEP_KEY,
  WIZARD_STEPS,
  type DiscoveredPhone,
  type WhatsappAccountSummary,
  type WizardStepId,
} from "@/lib/whatsapp-onboarding";
import { cn } from "@/lib/utils";

export function WhatsappConnectWizard({ onConnected }: { onConnected?: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStepId>("connect");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredPhone[]>([]);
  const [connected, setConnected] = useState<WhatsappAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastAutoDiscover = useRef("");

  useEffect(() => {
    const saved = sessionStorage.getItem(WIZARD_STEP_KEY) as WizardStepId | "prepare" | null;
    if (saved === "prepare") {
      setStep("connect");
      return;
    }
    if (saved && WIZARD_STEPS.some((s) => s.id === saved)) {
      setStep(saved);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(WIZARD_STEP_KEY, step);
    if (step === "verify" && connected) {
      sessionStorage.removeItem(WIZARD_STEP_KEY);
    }
  }, [step, connected]);

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
        body: JSON.stringify({ accessToken: accessToken.trim() }),
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
      setError(e instanceof ApiError ? e.message : "Could not find a number on this token.");
    },
  });

  const quickConnectMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        account: WhatsappAccountSummary;
        discovered: DiscoveredPhone[];
        autoSelected: boolean;
      }>("/whatsapp-accounts/quick-connect", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          phoneNumberId: phoneNumberId.trim() || undefined,
          wabaId: wabaId.trim() || undefined,
        }),
      }),
    onSuccess: (res) => {
      setConnected(res.account);
      setDiscovered(res.discovered);
      setError(null);
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: false,
        complete: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-connection-health"] });
      setStep("verify");
      onConnected?.();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Connection failed. Check your token and try again.");
    },
  });

  const busy = discoverMutation.isPending || quickConnectMutation.isPending;
  const needsPhonePick = discovered.length > 1;
  const canConnect =
    looksLikeMetaToken(accessToken) &&
    (!needsPhonePick || phoneNumberId.trim().length > 5);
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  const runDiscover = useCallback(() => {
    if (!looksLikeMetaToken(accessToken)) return;
    discoverMutation.mutate();
  }, [accessToken, discoverMutation]);

  useEffect(() => {
    const trimmed = accessToken.trim();
    if (!looksLikeMetaToken(trimmed) || trimmed === lastAutoDiscover.current) return;
    if (discoverMutation.isPending) return;

    const timer = setTimeout(() => {
      lastAutoDiscover.current = trimmed;
      runDiscover();
    }, 600);

    return () => clearTimeout(timer);
  }, [accessToken, discoverMutation.isPending, runDiscover]);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setAccessToken(text.trim());
        setError(null);
      }
    } catch {
      setError("Could not read clipboard. Paste manually with Ctrl+V.");
    }
  }

  function selectPhone(phone: DiscoveredPhone) {
    setPhoneNumberId(phone.phoneNumberId);
    setWabaId(phone.wabaId);
    setError(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce9ff] bg-white shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
      <div className="border-b border-[#dce9ff] bg-gradient-to-r from-[#ecfdf5]/80 via-white to-[#f8f9ff] px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
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
                      ? "bg-[#0b1c30] text-white shadow-md"
                      : "bg-[#dce9ff] text-muted-foreground",
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
                <div className="ml-2 hidden h-px w-8 bg-[#dce9ff] sm:block" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "connect" && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <WhatsappMetaSetupGuide metaApiSetupUrl={metaApiSetupUrl} />

              <div className="flex flex-col rounded-2xl border border-[#dce9ff] bg-[#f8f9ff]/40 p-5">
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
                    placeholder="EAA… — paste from Meta API Setup"
                    className="h-12 rounded-xl border-[#dce9ff] bg-white text-sm"
                    value={accessToken}
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
                    <p className="flex items-center gap-1.5 text-xs text-[#128C7E]">
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
                  disabled={busy || !canConnect}
                  variant="accent"
                  size="lg"
                  className="mt-5 h-12 w-full rounded-xl text-[15px] font-semibold"
                  onClick={() => quickConnectMutation.mutate()}
                >
                  {quickConnectMutation.isPending ? (
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
            <div className="flex items-start gap-3 rounded-2xl border border-[#6cf8bb]/40 bg-[#ecfdf5]/60 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#128C7E]" />
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

      <div className="flex items-center gap-2 border-t border-[#dce9ff] bg-[#f8f9ff]/50 px-6 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
        Meta-compliant · Tokens encrypted · One-click Facebook connect after App Review
      </div>
    </div>
  );
}
