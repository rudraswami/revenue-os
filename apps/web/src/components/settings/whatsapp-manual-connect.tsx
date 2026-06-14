"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

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
}: {
  onConnected?: () => void;
  defaultOpen?: boolean;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
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

  return (
    <div id="whatsapp-api-setup" className="rounded-2xl border border-amber-200 bg-amber-50/80">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="font-medium text-amber-950">Connect with Meta API Setup (testing)</p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            Use this until Tech Provider is approved — &quot;Continue with Facebook&quot; requires
            Meta BSP/TP status.
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-amber-800" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-amber-800" />
        )}
      </button>

      {open && (
        <div className="space-y-4 border-t border-amber-200 px-5 py-4">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-amber-950/90">
            <li>
              Meta → Revenue OS → Use cases → WhatsApp → <strong>API Setup</strong>
            </li>
            <li>
              Copy <strong>Phone number ID</strong>, <strong>WhatsApp Business Account ID</strong>,
              and generate a <strong>temporary access token</strong>
            </li>
            <li>Paste below and connect — then send a test WhatsApp to your number</li>
          </ol>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-amber-950">Temporary access token</label>
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
              <label className="text-xs font-medium text-amber-950">Phone number</label>
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
                <label className="text-xs font-medium text-amber-950">Phone number ID</label>
                <Input
                  placeholder="e.g. 1206645389192733"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-amber-950">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <Input
                  placeholder="From API Setup — above Phone number ID"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </div>
            </>
          )}

          <Button
            type="button"
            disabled={busy || !canConnect}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect test number
          </Button>
        </div>
      )}
    </div>
  );

}
