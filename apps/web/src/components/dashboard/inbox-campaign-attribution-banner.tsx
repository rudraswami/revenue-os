"use client";

import Link from "next/link";
import { Megaphone, MessageCircleReply } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CampaignAttribution {
  campaignId: string;
  campaignName: string;
  recipientId?: string;
  attributedAt?: string;
}

/** Inbox thread banner — customer replied to a WhatsApp broadcast. */
export function InboxCampaignAttributionBanner({
  attribution,
  className,
}: {
  attribution: CampaignAttribution;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-violet-200/60 bg-gradient-to-r from-violet-50/95 via-background to-background px-4 py-3 lg:px-5",
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <MessageCircleReply className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700/90">
          Campaign reply
        </p>
        <p className="mt-0.5 text-sm text-foreground">
          This contact replied to{" "}
          <Link
            href={`/dashboard/campaigns?campaign=${attribution.campaignId}`}
            className="font-semibold text-violet-800 underline-offset-2 hover:underline"
          >
            {attribution.campaignName}
          </Link>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Follow up from Inbox — replies are never auto-sent by Growvisi.
        </p>
      </div>
      <Link
        href={`/dashboard/campaigns?campaign=${attribution.campaignId}`}
        className="hidden shrink-0 items-center gap-1 rounded-lg border border-violet-200/80 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50 sm:inline-flex"
      >
        <Megaphone className="h-3.5 w-3.5" />
        View campaign
      </Link>
    </div>
  );
}
