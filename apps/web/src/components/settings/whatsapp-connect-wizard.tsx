"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface DiscoveredPhone {
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
}

interface WhatsappAccount {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
}

const STEPS = [
  { id: "intro", title: "Your number" },
  { id: "meta", title: "Meta setup" },
  { id: "connect", title: "Connect" },
  { id: "verify", title: "Test" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function WhatsappConnectWizard({ onConnected }: { onConnected?: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<StepId>("intro");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredPhone[]>([]);
  const [connected, setConnected] = useState<WhatsappAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMetaAccount, setHasMetaAccount] = useState(false);
  const [hasBusinessNumber, setHasBusinessNumber] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["embedded-signup-config"],
    queryFn: () =>
      apiFetch<{ appId: string }>("/whatsapp-accounts/embedded-signup/config", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const metaApiSetupUrl = config?.appId
    ? `https://developers.facebook.com/apps/${config.appId}/whatsapp-business/wa-dev-console/`
    : "https://developers.facebook.com/apps/";

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
      }
    },
    onError: (e) => {
      setDiscovered([]);
      setError(e instanceof ApiError ? e.message : "Could not find numbers for this token.");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; displayPhoneNumber: string }>("/whatsapp-accounts/verify-credentials", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          phoneNumberId: phoneNumberId.trim(),
        }),
      }),
    onSuccess: () => setError(null),
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Credentials could not be verified.");
    },
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      apiFetch<WhatsappAccount>("/whatsapp-accounts/connect", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim() || undefined,
        }),
      }),
    onSuccess: (account) => {
      setConnected(account);
      setError(null);
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: false,
        complete: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      setStep("verify");
      onConnected?.();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Connection failed.");
    },
  });

  const busy =
    discoverMutation.isPending || verifyMutation.isPending || connectMutation.isPending;
  const canConnect = accessToken.trim().length > 10 && phoneNumberId.trim().length > 5;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      {/* Progress */}
      <div className="border-b border-border/80 bg-gradient-to-r from-[#25D366]/5 via-primary-soft/30 to-transparent px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#128C7E]">
          Connect your existing WhatsApp Business number
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You keep your number — Growvisi only ingests messages for intelligence and pipeline
          tracking.
        </p>
        <div className="mt-5 flex gap-3">
          {STEPS.map((s, i) => (
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
        <p className="mt-3 text-xs text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}: <strong className="text-foreground">{STEPS[stepIndex].title}</strong>
        </p>
      </div>

      <div className="space-y-4 px-6 py-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "intro" && (
          <>
            <div className="flex items-start gap-3 rounded-xl bg-[#25D366]/10 p-4">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#128C7E]" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Bring the number you already use</p>
                <p className="mt-1 text-muted-foreground">
                  Growvisi does <strong className="text-foreground">not</strong> give you a new
                  WhatsApp number. Connect the business line your customers already message on
                  WhatsApp.
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 p-3 transition-colors hover:bg-muted/40 has-[:checked]:border-primary/30 has-[:checked]:bg-primary-soft/30">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={hasMetaAccount}
                    onChange={(e) => setHasMetaAccount(e.target.checked)}
                  />
                  <span>
                    <strong className="text-foreground">Meta Business account</strong>
                    <span className="block text-muted-foreground">
                      You can log in at business.facebook.com
                    </span>
                  </span>
                </label>
              </li>
              <li className="flex gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 p-3 transition-colors hover:bg-muted/40 has-[:checked]:border-primary/30 has-[:checked]:bg-primary-soft/30">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={hasBusinessNumber}
                    onChange={(e) => setHasBusinessNumber(e.target.checked)}
                  />
                  <span>
                    <strong className="text-foreground">WhatsApp Business number</strong>
                    <span className="block text-muted-foreground">
                      Already on WhatsApp Business Platform or API Setup in Meta
                    </span>
                  </span>
                </label>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              Need help? Email{" "}
              <a href="mailto:support@growvisi.in" className="text-primary hover:underline">
                support@growvisi.in
              </a>{" "}
              — we can walk you through onboarding on a short call.
            </p>

            <Button
              className="w-full sm:w-auto"
              disabled={!hasMetaAccount || !hasBusinessNumber}
              onClick={goNext}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {step === "meta" && (
          <>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              <li>
                Open{" "}
                <a
                  href={metaApiSetupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Meta → WhatsApp → API Setup
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                Under <strong className="text-foreground">From</strong>, note your{" "}
                <strong className="text-foreground">Phone number ID</strong> and{" "}
                <strong className="text-foreground">WhatsApp Business Account ID</strong>
              </li>
              <li>
                Click <strong className="text-foreground">Generate access token</strong> and copy
                the temporary token (starts with <code className="text-xs">EAA…</code>)
              </li>
              <li>
                Add your personal phone under <strong className="text-foreground">To</strong> as a
                test recipient if you use a Meta test number
              </li>
            </ol>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <strong>Important:</strong> Meta&apos;s &quot;Send test message&quot; button sends{" "}
              <em>from</em> your business number <em>to</em> your phone — that will not appear in
              Growvisi. After connecting, message <strong>your business number from your phone</strong>{" "}
              to see conversations here.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button asChild variant="outline">
                <a href={metaApiSetupUrl} target="_blank" rel="noopener noreferrer">
                  Open Meta API Setup
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button onClick={goNext}>
                I have my credentials
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "connect" && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Temporary access token
              </label>
              <Input
                type="password"
                autoComplete="off"
                placeholder="Paste from Meta API Setup (EAA…)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || accessToken.trim().length < 10}
                onClick={() => discoverMutation.mutate()}
              >
                {discoverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Find my numbers
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || !canConnect}
                onClick={() => verifyMutation.mutate()}
              >
                {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Validate
              </Button>
            </div>

            {discovered.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Your phone number</label>
                <Select
                  value={phoneNumberId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPhoneNumberId(id);
                    const match = discovered.find((p) => p.phoneNumberId === id);
                    if (match) setWabaId(match.wabaId);
                  }}
                >
                  <option value="">Select a number…</option>
                  {discovered.map((p) => (
                    <option key={p.phoneNumberId} value={p.phoneNumberId}>
                      {p.displayPhoneNumber}
                      {p.verifiedName ? ` (${p.verifiedName})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Phone number ID</label>
                  <Input
                    placeholder="e.g. 1206645389192733"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">WABA ID</label>
                  <Input
                    placeholder="WhatsApp Business Account ID"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button disabled={busy || !canConnect} onClick={() => connectMutation.mutate()}>
                {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect my number
              </Button>
            </div>
          </>
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
                <p className="text-sm text-muted-foreground">{connected.displayPhoneNumber}</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <MessageCircle className="h-4 w-4 text-primary" />
                Verify message ingestion
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>
                  On your <strong className="text-foreground">personal phone</strong>, open WhatsApp
                </li>
                <li>
                  Send any message <strong className="text-foreground">to</strong>{" "}
                  {connected.displayPhoneNumber}
                </li>
                <li>
                  Open <strong className="text-foreground">Conversations</strong> in Growvisi — it
                  should appear within ~10 seconds
                </li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/inbox">
                  Open Conversations
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings">Settings & diagnostics</Link>
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Tokens are encrypted. Growvisi never posts replies unless you use optional human takeover.
      </div>
    </div>
  );
}
