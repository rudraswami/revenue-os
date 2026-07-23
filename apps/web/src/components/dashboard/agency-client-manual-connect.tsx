"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsappMetaSetupGuide } from "@/components/settings/whatsapp-meta-setup-guide";
import { WhatsappPhonePicker } from "@/components/settings/whatsapp-phone-picker";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import { useAuthStore } from "@/stores/auth-store";
import { looksLikeMetaToken, normalizeMetaToken, type DiscoveredPhone } from "@/lib/whatsapp-onboarding";

interface WhatsappAccount {
  id: string;
  displayPhoneNumber: string;
}

export function AgencyClientManualConnect({
  clientOrganizationId,
  clientName,
  onConnected,
}: {
  clientOrganizationId: string;
  clientName: string;
  onConnected?: () => void;
}) {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

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
      if (phones.length >= 1) {
        setPhoneNumberId(phones[0].phoneNumberId);
        setWabaId(phones[0].wabaId);
      }
    },
    onError: (e) => {
      setDiscovered([]);
      setError(toUserMessage(e, t("agency.connect.tokenError")));
    },
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ account: WhatsappAccount }>(
        `/agency/clients/${clientOrganizationId}/quick-connect`,
        {
          method: "POST",
          token: token ?? undefined,
          body: JSON.stringify({
            accessToken: normalizeMetaToken(accessToken),
            phoneNumberId: phoneNumberId.trim() || undefined,
            wabaId: wabaId.trim() || undefined,
          }),
        },
      ),
    onSuccess: () => {
      setError(null);
      invalidateWorkspaceShellCache(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["agency-clients-health"] });
      onConnected?.();
    },
    onError: (e) => {
      setError(toUserMessage(e, t("agency.connect.tokenError")));
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {formatMessage(t("agency.connect.tokenSubtitle"), { name: clientName })}
      </p>

      <WhatsappMetaSetupGuide metaApiSetupUrl={metaApiSetupUrl} />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">
            {t("agency.connect.tokenLabel")}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() =>
              void (async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text.trim()) applyToken(text);
                  else setError(t("agency.connect.clipboardEmpty"));
                } catch {
                  setError(t("agency.connect.clipboardDenied"));
                }
              })()
            }
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            {t("agency.connect.paste")}
          </Button>
        </div>
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="EAA…"
          className="font-mono"
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
            {t("agency.connect.discovering")}
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
        className="w-full rounded-xl"
        disabled={connecting || !canConnect}
        onClick={() => connectMutation.mutate()}
      >
        {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("agency.connect.tokenConnectBtn")}
      </Button>
    </div>
  );
}
