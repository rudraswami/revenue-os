"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useShellConnectionHealth,
  useShellWhatsappAccounts,
} from "@/hooks/use-shell-data";

/**
 * Global banner — only when token is invalid or expires in &lt; 4 hours.
 * "Soon" warnings live in Settings → WhatsApp only (temp tokens are ~24h).
 */
export function WhatsappTokenExpiryBanner() {
  const { data: accounts } = useShellWhatsappAccounts();
  const connected = accounts?.some((a) => a.isActive) ?? false;

  const { data: health } = useShellConnectionHealth<{
    tokenHealth?: {
      valid?: boolean;
      needsRefresh: boolean;
      hoursRemaining: number | null;
      hint?: string;
    };
  }>({
    enabled: connected,
    refetchInterval: connected ? 2 * 60_000 : false,
  });

  const th = health?.tokenHealth;
  const show = connected && th && (!th.valid || th.needsRefresh);

  if (!show) return null;

  const hours = th.hoursRemaining;
  const detail =
    !th.valid
      ? (th.hint ?? "Your Meta connection needs attention. Reconnect WhatsApp in Settings.")
      : hours != null && hours < 1
        ? "Meta access expires in less than an hour — reconnect soon to keep messages flowing."
        : hours != null
          ? `Meta access expires in ~${Math.ceil(hours)} hours. Reconnect WhatsApp in Settings if messages stop.`
          : (th.hint ?? "Reconnect WhatsApp in Settings to restore message sync.");

  return (
    <div className="border-b border-warning/30 bg-card px-4 py-2.5 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warning">WhatsApp connection needs attention</p>
            <p className="text-xs text-warning">{detail}</p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 border-warning/30 bg-card/90"
        >
          <Link href="/dashboard/settings?tab=whatsapp">
            Open WhatsApp settings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
