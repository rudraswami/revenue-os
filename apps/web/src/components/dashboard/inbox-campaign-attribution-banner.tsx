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
        "relative overflow-hidden border-b border-violet-300/40 px-4 py-4 lg:px-5",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 via-violet-700/85 to-emerald-800/80" />
      <div className="absolute -right-6 top-0 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-start gap-3 text-white">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <MessageCircleReply className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
            Campaign reply
          </p>
          <p className="mt-1 text-sm font-medium leading-snug">
            Replied to{" "}
            <Link
              href={`/dashboard/campaigns?campaign=${attribution.campaignId}`}
              className="font-bold underline underline-offset-2 hover:text-white/90"
            >
              {attribution.campaignName}
            </Link>
          </p>
          <p className="mt-1.5 text-xs text-white/85">
            Follow up from Inbox — your team sends replies, not Growvisi.
          </p>
        </div>
        <Link
          href={`/dashboard/campaigns?campaign=${attribution.campaignId}`}
          className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/30 sm:inline-flex"
        >
          <Megaphone className="h-3.5 w-3.5" />
          View campaign
        </Link>
      </div>
    </div>
  );
}
