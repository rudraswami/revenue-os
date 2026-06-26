"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Global banner — only when token is invalid or expires in &lt; 4 hours.
 * "Soon" warnings live in Settings → WhatsApp only (temp tokens are ~24h).
 */
export function WhatsappTokenExpiryBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 30_000,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;

  const { data: health } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<{
        tokenHealth?: {
          valid?: boolean;
          needsRefresh: boolean;
          hoursRemaining: number | null;
          hint?: string;
        };
      }>("/whatsapp-accounts/connection-health", { token: token ?? undefined }),
    enabled: !!token && connected,
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
  });

  const th = health?.tokenHealth;
  const show = connected && th && (!th.valid || th.needsRefresh);

  if (!show) return null;

  const hours = th.hoursRemaining;
  const detail =
    !th.valid
      ? (th.hint ?? "Your Meta access token is invalid. Paste a new one in Settings.")
      : hours != null && hours < 1
        ? "Token expires in less than an hour — message ingestion will stop."
        : hours != null
          ? `Token expires in ~${Math.ceil(hours)} hours. Paste a new token from Meta API Setup.`
          : (th.hint ?? "Refresh your Meta access token in Settings.");

  return (
    <div className="border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-amber-50/95 to-orange-50/80 px-4 py-2.5 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">WhatsApp token needs refresh</p>
            <p className="text-xs text-amber-900/85">{detail}</p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 border-amber-300 bg-white/90"
        >
          <Link href="/dashboard/settings?tab=whatsapp">
            Refresh token
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
