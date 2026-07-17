"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { STATUS_TONE } from "@/lib/status-map";
import { cn } from "@/lib/utils";

export type AgencyConnectionStatus = "live" | "setup" | "token" | "disconnected";

const STATUS_CLASS: Record<AgencyConnectionStatus, string> = {
  live: STATUS_TONE.whatsapp,
  setup: STATUS_TONE.warning,
  token: STATUS_TONE.danger,
  disconnected: STATUS_TONE.muted,
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {t(STATUS_KEY[status])}
    </span>
  );
}
