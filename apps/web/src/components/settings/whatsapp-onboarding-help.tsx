"use client";

import { Headphones } from "lucide-react";
import { GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO } from "@growvisi/shared";
import { Button } from "@/components/ui/button";

export function WhatsappOnboardingHelp({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Need a hand?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Free 15-min setup call — we walk through Meta API Setup together.
            </p>
            <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-accent">
              <a href={GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO}>Book setup call →</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
