"use client";

import { ExternalLink, KeyRound } from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "Open API Setup",
    detail: "Meta Developer → Your app → WhatsApp → API Setup",
  },
  {
    n: 2,
    title: "Generate token",
    detail: 'Click "Generate access token" under the From section',
  },
  {
    n: 3,
    title: "Copy & paste",
    detail: "Paste the EAA… token in Growvisi — we find your number automatically",
  },
];

export function WhatsappMetaSetupGuide({ metaApiSetupUrl }: { metaApiSetupUrl: string }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
        <div className="border-b border-border/60 bg-[#1877F2]/5 px-4 py-2.5">
          <p className="text-xs font-semibold text-[#1877F2]">Meta Developer Console</p>
        </div>
        <div className="space-y-0 divide-y divide-border/60 p-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#25D366]/40 bg-[#25D366]/5 px-3 py-2">
            <KeyRound className="h-4 w-4 shrink-0 text-[#128C7E]" />
            <p className="text-[11px] text-muted-foreground">
              Token looks like: <code className="text-foreground">EAAxxxxxxxx…</code>
            </p>
          </div>
        </div>
      </div>
      <a
        href={metaApiSetupUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Open Meta API Setup
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
