"use client";

import { MessageCircle } from "lucide-react";
import { IntelligenceReplySettingsCard } from "@/components/dashboard/intelligence-reply-settings-card";
import { BusinessEmployeeProfileCard } from "@/components/dashboard/business-employee-profile-card";
import Link from "next/link";

/**
 * Primary Automations entry — one place to configure WhatsApp reply behaviour.
 */
export function WhatsAppAutoReplySetup() {
  return (
    <section className="space-y-5" aria-labelledby="whatsapp-auto-reply-heading">
      <div className="overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-bento-mint/70 via-card to-card shadow-[0_4px_24px_rgb(11_28_48/0.04)]">
        <div className="border-b border-accent/10 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="whatsapp-auto-reply-heading"
                className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                WhatsApp auto-reply
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Choose how Growvisi helps when customers message you. Your team always owns
                pricing, complaints, and deal terms — tap{" "}
                <span className="font-medium text-foreground">I&apos;ll handle this</span> in any
                thread to reply yourself.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <IntelligenceReplySettingsCard layout="hero" />
        </div>
      </div>

      <BusinessEmployeeProfileCard variant="compact" />

      <p className="text-center text-xs text-muted-foreground">
        Upload pricing &amp; FAQs in{" "}
        <Link href="/dashboard/ai" className="font-semibold text-accent hover:underline">
          Intelligence → Business Knowledge
        </Link>{" "}
        so auto-replies stay accurate.
      </p>
    </section>
  );
}
