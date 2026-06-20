"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
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
  const organization = useAuthStore((s) => s.organization);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStepId>("prepare");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredPhone[]>([]);
  const [connected, setConnected] = useState<WhatsappAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastAutoDiscover = useRef("");

  useEffect(() => {
    const saved = sessionStorage.getItem(WIZARD_STEP_KEY) as WizardStepId | null;
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
      apiFetch<{
        ready: boolean;
        metaApiSetupUrl: string;
        checks: Array<{ id: string; ok: boolean; detail: string }>;
      }>("/whatsapp-accounts/onboarding-readiness", { token: token ?? undefined }),
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
      setError(e instanceof ApiError ? e.message : "Could not find numbers for this token.");
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
      setError(e instanceof ApiError ? e.message : "Connection failed.");
    },
  });

  const busy = discoverMutation.isPending || quickConnectMutation.isPending;
  const canConnect =
    looksLikeMetaToken(accessToken) &&
    (phoneNumberId.trim().length > 5 || discovered.length === 1);
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

  const runDiscover = useCallback(() => {
    if (!looksLikeMetaToken(accessToken)) return;
    discoverMutation.mutate();
  }, [accessToken, discoverMutation]);

  // Auto-discover when user pastes a Meta token
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

  function goNext() {
    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }

  function goBack() {
    const prev = WIZARD_STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

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
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/80 bg-gradient-to-r from-[#25D366]/5 via-primary-soft/30 to-transparent px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#128C7E]">
          Connect your existing WhatsApp Business number
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You keep your number — Growvisi only ingests messages for intelligence and pipeline
          tracking.
        </p>
        <div className="mt-5 flex gap-3">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  i < stepIndex
                    ? "bg-success text-white"
                    : i === stepIndex
                      ? "bg-primary text-white shadow-md"
                      : "bg-border text-muted-foreground",
                )}
              >
                {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden truncate text-[10px] font-medium sm:block",
                  i === stepIndex ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-6 py-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "prepare" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Same number",
                  text: "Customers keep messaging the line they already use",
                },
                {
                  icon: Sparkles,
                  title: "Intelligence only",
                  text: "Classification, pipeline, insights — Meta still replies in-chat",
                },
                {
                  icon: Zap,
                  title: "~2 min setup",
                  text: "Paste one token from Meta — we find your number automatically",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/80 bg-muted/20 p-3 text-sm"
                >
                  <item.icon className="mb-2 h-4 w-4 text-primary" />
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>

            {readiness && (
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-xs",
                  readiness.ready
                    ? "border-success/30 bg-success/5 text-foreground"
                    : "border-amber-200 bg-amber-50 text-amber-950",
                )}
              >
                <p className="font-semibold">
                  {readiness.ready
                    ? "Growvisi is ready to receive your messages"
                    : "Growvisi server checks — contact support if any fail"}
                </p>
                <ul className="mt-2 space-y-1">
                  {readiness.checks.map((c) => (
                    <li key={c.id} className={c.ok ? "text-success" : ""}>
                      {c.ok ? "✓" : "○"} {c.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Meta Business account with your WhatsApp Business number on the Cloud API</li>
              <li>Temporary access token from Meta → WhatsApp → API Setup</li>
              <li>A personal phone to send one test message after connecting</li>
            </ol>

            <div className="flex flex-wrap gap-2">
              <Button onClick={goNext} className="gap-1.5">
                Start connection
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "connect" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <WhatsappMetaSetupGuide metaApiSetupUrl={metaApiSetupUrl} />

            <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-foreground">Access token</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => void pasteFromClipboard()}
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    Paste
                  </Button>
                </div>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder="Paste EAA… token — we detect your number automatically"
                  value={accessToken}
                  onChange={(e) => {
                    setAccessToken(e.target.value);
                    setError(null);
                  }}
                />
                {discoverMutation.isPending && (
                  <p className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Finding your WhatsApp numbers…
                  </p>
                )}
                {discovered.length > 0 && !discoverMutation.isPending && (
                  <p className="text-xs text-success">
                    Found {discovered.length} number{discovered.length > 1 ? "s" : ""} on this token
                  </p>
                )}
              </div>

              <WhatsappPhonePicker
                phones={discovered}
                selectedId={phoneNumberId}
                onSelect={selectPhone}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  disabled={busy || !canConnect}
                  className="gap-1.5"
                  onClick={() => quickConnectMutation.mutate()}
                >
                  {quickConnectMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Connect automatically
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                One click verifies your token, enables webhooks, and saves your number securely.
              </p>
            </div>
          </div>
        )}

        {step === "connect" && (
          <WhatsappOnboardingFaq />
        )}

        {step === "verify" && connected && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-medium text-foreground">Connected</p>
                <p className="text-lg font-semibold">
                  {connected.verifiedName ?? connected.displayPhoneNumber}
                </p>
                <p className="font-mono text-sm text-muted-foreground">
                  {connected.displayPhoneNumber}
                </p>
              </div>
            </div>

            <WhatsappIngestionVerifier displayPhoneNumber={connected.displayPhoneNumber} />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/80 bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Tokens are encrypted. Growvisi never posts replies unless you use optional human takeover.
      </div>
    </div>
  );
}
