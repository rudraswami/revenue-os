"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export type AgencyConnectionStatus = "live" | "setup" | "token" | "disconnected";

const STATUS_CLASS: Record<AgencyConnectionStatus, string> = {
  live: "border-[#6cf8bb]/40 bg-[#ecfdf5] text-[#128C7E]",
  setup: "border-amber-200/80 bg-amber-50 text-amber-900",
  token: "border-red-200/80 bg-red-50 text-red-800",
  disconnected: "border-border/80 bg-muted/40 text-muted-foreground",
};

const STATUS_KEY: Record<AgencyConnectionStatus, string> = {
  live: "agency.statusLive",
  setup: "agency.statusSetup",
  token: "agency.statusReconnect",
  disconnected: "agency.statusDisconnected",
};

export function AgencyConnectionBadge({
  status,
  className,
}: {
  status: AgencyConnectionStatus;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STATUS_CLASS[status],
        className,
      )}
    >
      {t(STATUS_KEY[status])}
    </span>
  );
}
