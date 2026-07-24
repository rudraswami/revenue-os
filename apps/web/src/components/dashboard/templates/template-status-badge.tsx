"use client";

import { cn } from "@/lib/utils";
import type { MessageTemplateStatus } from "@growvisi/shared";

const STYLES: Record<string, string> = {
  APPROVED: "bg-whatsapp/12 text-whatsapp ring-whatsapp/20",
  PENDING: "bg-warning/12 text-warning ring-warning/20",
  IN_APPEAL: "bg-warning/12 text-warning ring-warning/20",
  REJECTED: "bg-destructive/12 text-destructive ring-destructive/20",
  PAUSED: "bg-muted text-muted-foreground ring-border/40",
  DISABLED: "bg-muted text-muted-foreground ring-border/40",
};

const LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending review",
  IN_APPEAL: "In review",
  REJECTED: "Rejected",
  PAUSED: "Paused",
  DISABLED: "Disabled",
};

export function TemplateStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toUpperCase();
  const label = LABELS[key] ?? key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[key] ?? "bg-muted text-muted-foreground ring-border/40",
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
