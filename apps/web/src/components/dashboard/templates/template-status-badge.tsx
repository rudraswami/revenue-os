"use client";

import { cn } from "@/lib/utils";
import type { MessageTemplateStatus } from "@growvisi/shared";

const STYLES: Record<string, string> = {
  APPROVED: "bg-whatsapp/15 text-whatsapp",
  PENDING: "bg-warning/15 text-warning",
  IN_APPEAL: "bg-warning/15 text-warning",
  REJECTED: "bg-destructive/15 text-destructive",
  PAUSED: "bg-muted text-muted-foreground",
  DISABLED: "bg-muted text-muted-foreground",
};

export function TemplateStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toUpperCase();
  const label =
    key === "IN_APPEAL"
      ? "In review"
      : key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STYLES[key] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function isTemplateSendable(status: string): boolean {
  return (status as MessageTemplateStatus) === "APPROVED";
}
