"use client";

import { Headphones } from "lucide-react";
import { GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO } from "@growvisi/shared";
import { Button } from "@/components/ui/button";

export function WhatsappOnboardingHelp() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/40 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Need a hand with Meta API Setup?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Our team can walk you through connecting your existing business number on a short call
            — usually under 15 minutes.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0 bg-white">
        <a href={GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO}>Book concierge help</a>
      </Button>
    </div>
  );
}
