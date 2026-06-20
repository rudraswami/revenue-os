"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function WhatsappTokenExpiryBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;

  const { data: health } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<{
        tokenHealth?: {
          level?: "ok" | "soon" | "urgent";
          needsRefresh: boolean;
          needsAttention?: boolean;
          hoursRemaining: number | null;
          hint?: string;
        };
      }>("/whatsapp-accounts/connection-health", { token: token ?? undefined }),
    enabled: !!token && connected,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const level = health?.tokenHealth?.level;
  const show =
    connected &&
    (health?.tokenHealth?.needsAttention || health?.tokenHealth?.needsRefresh);

  if (!show || !health?.tokenHealth) return null;

  const urgent = level === "urgent" || health.tokenHealth.needsRefresh;
  const hours = health.tokenHealth.hoursRemaining;

  const detail = urgent
    ? hours != null && hours < 1
      ? "Token expires in less than an hour — message ingestion will stop."
      : hours != null
        ? `Token expires in ~${Math.ceil(hours)} hours. Paste a new one in Settings.`
        : (health.tokenHealth.hint ?? "Your Meta access token needs to be refreshed.")
    : `Token expires in ~${hours != null ? Math.ceil(hours) : 20} hours. Refresh soon to avoid gaps.`;

  return (
    <div
      className={cn(
        "border-b px-4 py-3 md:px-6",
        urgent
          ? "border-amber-200/80 bg-gradient-to-r from-amber-50 via-amber-50/90 to-orange-50/80"
          : "border-blue-200/60 bg-gradient-to-r from-blue-50/90 to-primary-soft/30",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              urgent ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-primary",
            )}
          >
            {urgent ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", urgent ? "text-amber-950" : "text-foreground")}>
              {urgent ? "Refresh your WhatsApp access token" : "WhatsApp token expiring soon"}
            </p>
            <p className={cn("text-xs", urgent ? "text-amber-900/80" : "text-muted-foreground")}>
              {detail}
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn(
            "h-8 shrink-0 gap-1.5 bg-white/80",
            urgent ? "border-amber-300" : "border-primary/30",
          )}
        >
          <Link href="/dashboard/settings#whatsapp">
            Refresh token
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
