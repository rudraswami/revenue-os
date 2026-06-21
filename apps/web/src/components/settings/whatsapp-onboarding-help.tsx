"use client";

import { Headphones } from "lucide-react";
import { GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO } from "@growvisi/shared";
import { Button } from "@/components/ui/button";

export function WhatsappOnboardingHelp() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-accent/20 bg-gradient-to-br from-[#ecfdf5]/60 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Prefer a guided setup?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Book a free 15-minute call — we&apos;ll walk you through Meta API Setup and connect your
            number together.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl bg-white">
        <a href={GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO}>Book setup call</a>
      </Button>
    </div>
  );
}
