"use client";

import { Check, CheckCheck, CircleAlert, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders WhatsApp-style delivery/read ticks for an OUTBOUND message.
 * Status values mirror the Prisma MessageStatus enum
 * (PENDING | SENT | DELIVERED | READ | FAILED). Read is shown in accent
 * (the "blue ticks" equivalent for Growvisi's palette).
 */
export function InboxMessageStatus({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const value = (status ?? "").toUpperCase();

  if (value === "FAILED") {
    return (
      <CircleAlert
        className={cn("h-3.5 w-3.5 text-destructive", className)}
        aria-label="Failed to send"
      />
    );
  }

  if (value === "READ") {
    return (
      <CheckCheck
        className={cn("h-3.5 w-3.5 text-info", className)}
        aria-label="Read"
      />
    );
  }

  if (value === "DELIVERED") {
    return (
      <CheckCheck
        className={cn("h-3.5 w-3.5 opacity-70", className)}
        aria-label="Delivered"
      />
    );
  }

  if (value === "SENT") {
    return (
      <Check className={cn("h-3.5 w-3.5 opacity-70", className)} aria-label="Sent" />
    );
  }

  // PENDING / optimistic / unknown
  return (
    <Clock
      className={cn("h-3 w-3 opacity-60", className)}
      aria-label="Sending"
    />
  );
}
