"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  launchEmbeddedSignup,
  listenEmbeddedSignup,
  loadFacebookSdk,
  type EmbeddedSignupSession,
} from "@/lib/facebook-sdk";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface WhatsappAccount {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  isActive: boolean;
}

interface EmbeddedConfig {
  enabled: boolean;
  appId: string;
  configId: string;
  graphApiVersion: string;
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
  const onboarding = useAuthStore((s) => s.onboarding);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<ConnectPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<WhatsappAccount | null>(null);

  const pendingCode = useRef<string | null>(null);
  const pendingSession = useRef<EmbeddedSignupSession | null>(null);
  const completing = useRef(false);

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

  const completeMutation = useMutation({
    mutationFn: (payload: { code: string; session: EmbeddedSignupSession }) =>
      apiFetch<WhatsappAccount>("/whatsapp-accounts/embedded-signup/complete", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          code: payload.code,
          phoneNumberId: payload.session.phoneNumberId,
          wabaId: payload.session.wabaId,
          finishEvent: payload.session.finishEvent,
        }),
      }),
    onSuccess: (account) => {
      setConnectedAccount(account);
      setPhase("done");
      setError(null);
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: onboarding?.firstMessageReceived ?? false,
        complete: true,
      });
      pendingCode.current = null;
      pendingSession.current = null;
      completing.current = false;
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
    },
    onError: (e) => {
      setPhase("error");
      setError(e instanceof ApiError ? e.message : "Connection failed. Please try again.");
      completing.current = false;
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

  const tryComplete = useCallback(() => {
    if (completing.current) return;
    const code = pendingCode.current;
    const session = pendingSession.current;
    if (!code || !session) return;

    completing.current = true;
    setPhase("saving");
    completeMutation.mutate({ code, session });
  }, [completeMutation]);

  useEffect(() => {
    return listenEmbeddedSignup(
      (session) => {
        pendingSession.current = session;
        tryComplete();
      },
      (message) => {
        if (phase === "waiting_meta") {
          setPhase("error");
          setError(message);
        }
      },
    );
  }, [tryComplete, phase]);

  const activeAccounts = accounts?.filter((a) => a.isActive) ?? [];
  const displayAccount = connectedAccount ?? activeAccounts[0] ?? null;

  async function handleConnect() {
    if (!config?.enabled) return;
    setError(null);
    setPhase("waiting_meta");

    try {
      await loadFacebookSdk(config.appId, config.graphApiVersion);
      const code = await launchEmbeddedSignup(config.configId);
      pendingCode.current = code;
      tryComplete();
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Could not open Facebook setup.");
    }
  }

  if (accountsLoading || configLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (displayAccount && phase !== "waiting_meta" && phase !== "saving") {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 to-card">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/20 text-[#25D366]">
                <WhatsAppIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  WhatsApp connected
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {displayAccount.verifiedName ?? "Your business line"}
                </h2>
                <p className="text-muted-foreground">{displayAccount.displayPhoneNumber}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-background/60 p-4">
              <p className="text-sm font-medium">Send a test message</p>
              <p className="mt-1 text-sm text-muted-foreground">
                From your personal phone, send a WhatsApp to{" "}
                <strong className="text-foreground">{displayAccount.displayPhoneNumber}</strong>.
                It will appear in your Inbox within a few seconds.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/dashboard/inbox">
                  Open Inbox
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground"
          disabled={disconnectMutation.isPending}
          onClick={() => {
            if (confirm(`Disconnect ${displayAccount.displayPhoneNumber}?`)) {
              disconnectMutation.mutate(displayAccount.id);
            }
          }}
        >
          Disconnect number
        </Button>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-lg font-semibold">WhatsApp setup coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your workspace is not ready for self-serve WhatsApp connection yet. Our team will enable
          this for you shortly.
        </p>
      </div>
    );
  }

  const steps = [
    {
      icon: Smartphone,
      title: "Use your business account",
      text: "Sign in with the Facebook account that manages your business on WhatsApp.",
    },
    {
      icon: ShieldCheck,
      title: "Pick your number",
      text: "Choose the WhatsApp Business line your customers already message.",
    },
    {
      icon: MessageCircle,
      title: "Start receiving chats",
      text: "Messages flow into your team Inbox automatically — no extra setup.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-gradient-to-r from-[#1877F2]/10 via-primary/5 to-[#25D366]/10 px-6 py-8 md:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/20 text-[#25D366]">
              <WhatsAppIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">Connect WhatsApp Business</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Link the number your customers use today. Takes about 2 minutes — we handle the
                technical setup for you.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-xl bg-muted/30 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </div>
              <step.icon className="mb-2 h-5 w-5 text-muted-foreground" />
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-6 md:px-8">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

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
                : "Continue with Facebook"}
          </Button>

          <p className="mt-3 max-w-md text-xs text-muted-foreground">
            Secure connection powered by Meta. GrowthSync never sees your Facebook password.
          </p>
        </div>
      </div>
    </div>
  );
}
