"use client";

import { ExternalLink, KeyRound, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: 1,
    title: "Open Meta API Setup",
    detail: "Log in with the Facebook account that manages your WhatsApp Business.",
    highlight: true,
  },
  {
    n: 2,
    title: 'Click "Generate access token"',
    detail: 'Under the "From" section — copy the full token (starts with EAA).',
  },
  {
    n: 3,
    title: "Paste in Growvisi",
    detail: "We detect your business number automatically. No IDs to copy.",
  },
];

export function WhatsappMetaSetupGuide({ metaApiSetupUrl }: { metaApiSetupUrl: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-[#f8f9ff]/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Setup assist
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          One-click <strong className="text-foreground">Connect with Facebook</strong> launches after
          Meta App Review. Until then, paste one token — takes about 2 minutes.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="h-12 w-full gap-2 rounded-xl bg-[#1877F2] text-[15px] font-semibold hover:bg-[#166FE0]"
      >
        <a href={metaApiSetupUrl} target="_blank" rel="noopener noreferrer">
          Open Meta API Setup
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-[#1877F2]/8 to-[#25D366]/5 px-4 py-3">
          <p className="text-xs font-semibold text-[#1877F2]">Where to find your token</p>
        </div>

        <div className="space-y-0 divide-y divide-[#dce9ff]/80 p-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
              <span
                className={
                  step.highlight
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[11px] font-bold text-white"
                    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b1c30] text-[11px] font-bold text-white"
                }
              >
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-[#f8f9ff]/50 px-4 py-4">
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-[#25D366]/35 bg-[#ecfdf5]/60 px-3.5 py-3">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#128C7E]" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p>
                Your token starts with{" "}
                <span className="font-semibold text-foreground">EAA</span> and is long — copy all of
                it.
              </p>
              <p className="mt-1.5 flex items-center gap-1.5">
                <MousePointerClick className="h-3.5 w-3.5 text-accent" />
                Tokens expire in ~24h — refresh anytime in Settings without reconnecting.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Stuck?{" "}
        <a href="mailto:support@growvisi.in" className="font-medium text-accent hover:underline">
          Book a 15-min setup call
        </a>
      </p>
    </div>
  );
}
