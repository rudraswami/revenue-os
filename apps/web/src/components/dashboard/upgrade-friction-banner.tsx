"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { trackConversionFriction } from "@/lib/conversion-friction-analytics";
import { cn } from "@/lib/utils";

export type FrictionReason = "seats" | "whatsapp" | "leads" | "agency_clients" | "trial" | string;

const TITLE: Record<string, string> = {
  seats: "Seat limit reached",
  whatsapp: "WhatsApp number limit reached",
  leads: "Monthly lead limit reached",
  agency_clients: "Client workspace limit reached",
  trial: "Upgrade to continue",
};

/**
 * Mid-action upgrade prompt — shown when capacity blocks the job.
 * Deep-links to Plans with suggested plan when known.
 */
export function UpgradeFrictionBanner({
  reason,
  message,
  suggestedPlan,
  limit,
  used,
  className,
  compact,
}: {
  reason?: FrictionReason | null;
  message: string;
  suggestedPlan?: string | null;
  limit?: number | null;
  used?: number | null;
  className?: string;
  compact?: boolean;
}) {
  const viewedRef = useRef(false);
  const href = suggestedPlan
    ? `/dashboard/pricing?plan=${encodeURIComponent(suggestedPlan)}&reason=${encodeURIComponent(reason ?? "limit")}`
    : `/dashboard/pricing?reason=${encodeURIComponent(reason ?? "limit")}`;

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackConversionFriction("conversion_friction_view", {
      reason: reason ?? "limit",
      suggestedPlan: suggestedPlan ?? undefined,
      limit: limit ?? undefined,
      used: used ?? undefined,
    });
  }, [reason, suggestedPlan, limit, used]);

  const title = TITLE[reason ?? ""] ?? "Upgrade for more capacity";

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/90 bg-card elev-1",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("font-semibold text-amber-950", compact ? "text-xs" : "text-sm")}>
            {title}
          </p>
          <p className={cn("mt-0.5 text-amber-900/85", compact ? "text-xs" : "text-xs")}>
            {message}
            {used != null && limit != null ? ` (${used}/${limit})` : ""}
          </p>
        </div>
        <Link
          href={href}
          onClick={() =>
            trackConversionFriction("conversion_friction_click", {
              reason: reason ?? "limit",
              suggestedPlan: suggestedPlan ?? undefined,
            })
          }
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          See plans
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
