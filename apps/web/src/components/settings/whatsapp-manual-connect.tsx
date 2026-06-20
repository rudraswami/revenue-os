"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ClipboardPaste, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsappPhonePicker } from "@/components/settings/whatsapp-phone-picker";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { looksLikeMetaToken, type DiscoveredPhone } from "@/lib/whatsapp-onboarding";
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

  useEffect(() => {
    if (defaultOpen || isPrimary) setOpen(true);
  }, [defaultOpen, isPrimary]);

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
      if (phones.length >= 1) {
        setPhoneNumberId(phones[0].phoneNumberId);
        setWabaId(phones[0].wabaId);
      }
    },
    onError: (e) => {
      setDiscovered([]);
      setError(e instanceof ApiError ? e.message : "Could not find numbers for this token.");
    },
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ account: WhatsappAccount }>("/whatsapp-accounts/quick-connect", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          accessToken: accessToken.trim(),
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
      setError(e instanceof ApiError ? e.message : "Connection failed.");
    },
  });

  const busy = discoverMutation.isPending || connectMutation.isPending;
  const canConnect =
    looksLikeMetaToken(accessToken) &&
    (phoneNumberId.trim().length > 5 || discovered.length === 1);

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

  const shellClass = isPrimary
    ? "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
    : "overflow-hidden rounded-2xl border border-border/80 bg-muted/20";

  const headerClass = isPrimary
    ? "border-b border-border/80 bg-gradient-to-r from-[#25D366]/10 to-primary/5"
    : "";

  return (
    <div id="whatsapp-api-setup" className={shellClass}>
      {!isPrimary && (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div>
            <p className="font-medium text-foreground">Advanced: Meta API Setup</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste token — numbers are detected automatically.
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
        <div className={cn("px-6 py-5", headerClass)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#128C7E]">
            Compact connect
          </p>
          <h3 className="text-lg font-semibold">Paste token & connect</h3>
        </div>
      )}

      {open && (
        <div
          className={cn(
            "space-y-4 px-5 py-4",
            !isPrimary && "border-t border-border",
            isPrimary && "px-6 pb-6",
          )}
        >
          <p className="text-sm text-muted-foreground">
            Get your token from{" "}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              Meta → API Setup
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Access token</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) setAccessToken(text.trim());
                  } catch {
                    setError("Paste manually with Ctrl+V.");
                  }
                }}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste
              </Button>
            </div>
            <Input
              type="password"
              autoComplete="off"
              placeholder="EAA…"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>

          <WhatsappPhonePicker
            phones={discovered}
            selectedId={phoneNumberId}
            onSelect={(p) => {
              setPhoneNumberId(p.phoneNumberId);
              setWabaId(p.wabaId);
            }}
          />

          <Button
            type="button"
            disabled={busy || !canConnect}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect automatically
          </Button>
        </div>
      )}
    </div>
  );
}
