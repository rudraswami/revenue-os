"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ClipboardPaste, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WhatsappMetaSetupGuide } from "@/components/settings/whatsapp-meta-setup-guide";
import { WhatsappPhonePicker } from "@/components/settings/whatsapp-phone-picker";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { looksLikeMetaToken, normalizeMetaToken, type DiscoveredPhone } from "@/lib/whatsapp-onboarding";
import { cn } from "@/lib/utils";

interface WhatsappAccount {
  id: string;
  displayPhoneNumber: string;
}

export function WhatsappManualConnect({
  onConnected,
  defaultOpen = false,
  variant = "secondary",
}: {
  onConnected?: () => void;
  defaultOpen?: boolean;
  variant?: "primary" | "secondary";
}) {
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const isPrimary = variant === "primary";
  const [open, setOpen] = useState(isPrimary || defaultOpen);
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredPhone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastAutoDiscover = useRef("");

  const { data: readiness } = useQuery({
    queryKey: ["whatsapp-onboarding-readiness"],
    queryFn: () =>
      apiFetch<{ metaApiSetupUrl: string }>("/whatsapp-accounts/onboarding-readiness", {
        token: token ?? undefined,
      }),
    enabled: !!token && open,
    staleTime: 60_000,
  });

  const metaApiSetupUrl = readiness?.metaApiSetupUrl ?? "https://developers.facebook.com/apps/";

  useEffect(() => {
    if (defaultOpen || isPrimary) setOpen(true);
  }, [defaultOpen, isPrimary]);

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
      if (phones.length >= 1) {
        setPhoneNumberId(phones[0].phoneNumberId);
        setWabaId(phones[0].wabaId);
      }
    },
    onError: (e) => {
      setDiscovered([]);
      setError(toUserMessage(e, "Could not find a number on this token."));
    },
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ account: WhatsappAccount }>("/whatsapp-accounts/quick-connect", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          accessToken: normalizeMetaToken(accessToken),
          phoneNumberId: phoneNumberId.trim() || undefined,
          wabaId: wabaId.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setError(null);
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: false,
        complete: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      onConnected?.();
    },
    onError: (e) => {
      setError(toUserMessage(e, "Connection failed."));
    },
  });

  const connecting = connectMutation.isPending;
  const needsPhonePick = discovered.length > 1;
  const canConnect =
    looksLikeMetaToken(accessToken) && (!needsPhonePick || phoneNumberId.trim().length > 5);

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

  const shellClass = isPrimary
    ? "overflow-hidden rounded-2xl border border-[#dce9ff] bg-white shadow-sm"
    : "overflow-hidden rounded-2xl border border-[#dce9ff] bg-[#f8f9ff]/50";

  return (
    <div id="whatsapp-api-setup" className={shellClass}>
      {!isPrimary && (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div>
            <p className="font-semibold text-foreground">Connect with access token</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste from Meta API Setup — your number is detected automatically.
            </p>
          </div>
          {open ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>
      )}

      {isPrimary && (
        <div className="border-b border-[#dce9ff] bg-gradient-to-r from-[#ecfdf5]/60 to-transparent px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Quick connect</p>
          <h3 className="text-lg font-bold">Paste token & connect</h3>
        </div>
      )}

      {open && (
        <div className={cn("space-y-5 p-5", isPrimary && "px-6 pb-6")}>
          <WhatsappMetaSetupGuide metaApiSetupUrl={metaApiSetupUrl} />

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-[#dce9ff] bg-white p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Access token</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => void (async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) applyToken(text);
                    else setError("Clipboard is empty.");
                  } catch {
                    setError("Click the field and press Ctrl+V (or ⌘V on Mac).");
                  }
                })()}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste
              </Button>
            </div>
            <textarea
              autoComplete="off"
              spellCheck={false}
              rows={3}
              placeholder="EAA… from Meta API Setup"
              className="min-h-[72px] w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              value={accessToken}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (!text.trim()) return;
                e.preventDefault();
                applyToken(text);
              }}
              onBlur={() => {
                const normalized = normalizeMetaToken(accessToken);
                if (normalized && normalized !== accessToken) setAccessToken(normalized);
              }}
              onChange={(e) => {
                setAccessToken(e.target.value);
                setError(null);
              }}
            />
            {discoverMutation.isPending && (
              <p className="flex items-center gap-2 text-xs text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Finding your number…
              </p>
            )}
          </div>

          {needsPhonePick && (
            <WhatsappPhonePicker
              phones={discovered}
              selectedId={phoneNumberId}
              onSelect={(p) => {
                setPhoneNumberId(p.phoneNumberId);
                setWabaId(p.wabaId);
              }}
            />
          )}

          <Button
            type="button"
            variant="accent"
            className="w-full rounded-xl"
            disabled={connecting || !canConnect}
            onClick={() => connectMutation.mutate()}
          >
            {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect my number
          </Button>
        </div>
      )}
    </div>
  );
}
