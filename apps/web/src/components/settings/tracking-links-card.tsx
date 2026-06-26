"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, MousePointerClick, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface TrackingLinkRow {
  id: string;
  name: string;
  slug: string;
  phone: string;
  prefilledText: string | null;
  utmCampaign: string | null;
  clickCount: number;
  trackedUrl: string;
  waDirectUrl: string;
}

export function TrackingLinksCard() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [prefilledText, setPrefilledText] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: links, isLoading, isError } = useQuery({
    queryKey: ["tracking-links"],
    queryFn: () => apiFetch<TrackingLinkRow[]>("/tracking/links", { token: token ?? undefined }),
    enabled: !!token,
    retry: false,
  });

  const { data: metrics } = useQuery({
    queryKey: ["tracking-metrics"],
    queryFn: () =>
      apiFetch<Array<{ campaign: string; leads: number; won: number }>>("/tracking/metrics", {
        token: token ?? undefined,
      }),
    enabled: !!token && !isError,
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<TrackingLinkRow>("/tracking/links", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          prefilledText: prefilledText.trim() || undefined,
          utmCampaign: utmCampaign.trim() || undefined,
          utmSource: "growvisi",
          utmMedium: "whatsapp",
        }),
      }),
    onSuccess: () => {
      setName("");
      setPhone("");
      setPrefilledText("");
      setUtmCampaign("");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["tracking-links"] });
      void qc.invalidateQueries({ queryKey: ["tracking-metrics"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not create link."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tracking/links/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tracking-links"] });
      void qc.invalidateQueries({ queryKey: ["tracking-metrics"] });
    },
  });

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Click-to-chat links are available on Growth and Pro plans.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Link2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Click-to-chat links</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tracked WhatsApp links for ads and QR codes. Clicks are counted; when someone messages,
            Growvisi attributes the lead to your campaign.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Link name — Diwali ad"
          className="h-9 text-sm"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number (919876543210)"
          className="h-9 text-sm"
        />
        <Input
          value={utmCampaign}
          onChange={(e) => setUtmCampaign(e.target.value)}
          placeholder="UTM campaign (optional)"
          className="h-9 text-sm"
        />
        <Input
          value={prefilledText}
          onChange={(e) => setPrefilledText(e.target.value)}
          placeholder="Prefilled message (optional)"
          className="h-9 text-sm"
        />
      </div>
      <Button
        size="sm"
        disabled={!name.trim() || !phone.trim() || createMut.isPending}
        onClick={() => createMut.mutate()}
      >
        Create tracked link
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="space-y-2">
          {(links ?? []).map((link) => (
            <li
              key={link.id}
              className="rounded-xl border border-border/80 bg-white px-4 py-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{link.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {link.clickCount} clicks
                    {link.utmCampaign && ` · ${link.utmCampaign}`}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-accent">{link.trackedUrl}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyUrl(link.trackedUrl, link.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied === link.id ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteMut.mutate(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {(links?.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground">No links yet — create one for your next ad.</p>
          )}
        </ul>
      )}

      {(metrics?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border/80 bg-[#f8f9ff] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Leads by campaign
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {metrics!.slice(0, 6).map((m) => (
              <li key={m.campaign} className="flex justify-between">
                <span className="truncate font-medium">{m.campaign}</span>
                <span className="text-muted-foreground">
                  {m.leads} leads · {m.won} won
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
