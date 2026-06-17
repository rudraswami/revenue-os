"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export function WhatsappManualConnect({
  onConnected,
  defaultOpen = false,
  variant = "secondary",
}: {
  onConnected?: () => void;
  defaultOpen?: boolean;
  /** primary = recommended card (pre–App Review); secondary = collapsed advanced option */
  variant?: "primary" | "secondary";
}) {
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const isPrimary = variant === "primary";
  const [open, setOpen] = useState(isPrimary || defaultOpen);

  useEffect(() => {
    if (defaultOpen || isPrimary) setOpen(true);
  }, [defaultOpen, isPrimary]);

  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredPhone[]>([]);
  const [error, setError] = useState<string | null>(null);

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
  const canConnect = accessToken.trim().length > 10 && phoneNumberId.trim().length > 5;

  const shellClass = isPrimary
    ? "rounded-2xl border border-border bg-card shadow-sm"
    : "rounded-2xl border border-border bg-muted/20";

  const headerClass = isPrimary
    ? "border-b border-border bg-gradient-to-r from-[#25D366]/10 to-primary/5"
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
              Connect with a temporary token from Meta Developer dashboard.
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
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#128C7E]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#128C7E]">
                Recommended
              </p>
              <h3 className="text-lg font-semibold">Connect via Meta Developer</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste credentials from Meta → WhatsApp → API Setup. Works while one-click Facebook
                signup is pending approval.
              </p>
            </div>
          </div>
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
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
              >
                Meta Developer
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → your app → WhatsApp → <strong className="text-foreground">API Setup</strong>
            </li>
            <li>
              Copy <strong className="text-foreground">Phone number ID</strong>,{" "}
              <strong className="text-foreground">WABA ID</strong>, and generate a{" "}
              <strong className="text-foreground">temporary access token</strong>
            </li>
            <li>Paste below — then send a test message to your business number</li>
          </ol>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Temporary access token</label>
            <Input
              type="password"
              autoComplete="off"
              placeholder="EAAV…"
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
          </div>

          {discovered.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Phone number</label>
              <select
                className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
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
              </select>
            </div>
          )}

          {discovered.length === 0 && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Phone number ID</label>
                <Input
                  placeholder="e.g. 1206645389192733"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <Input
                  placeholder="From API Setup"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="button" disabled={busy || !canConnect} onClick={() => connectMutation.mutate()}>
            {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
