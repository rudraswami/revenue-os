"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "audience", label: "Audience", short: "1" },
  { id: "template", label: "Template", short: "2" },
  { id: "send", label: "Send", short: "3" },
] as const;

export type CampaignWizardStep = (typeof STEPS)[number]["id"];

export function CampaignWizardSteps({
  current,
  className,
}: {
  current: CampaignWizardStep;
  className?: string;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {STEPS.map((step, idx) => {
        const active = step.id === current;
        const done = idx < currentIdx;
        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                  done && "bg-accent text-white",
                  active && !done && "bg-primary text-white ring-4 ring-accent/20",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : step.short}
              </span>
              <span
                className={cn(
                  "text-center text-[11px] font-semibold sm:text-left sm:text-xs",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 hidden h-0.5 flex-1 sm:block",
                  idx < currentIdx ? "bg-accent" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CampaignWizardSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-gradient-to-b from-card to-background/80 p-5 elev-1",
        className,
      )}
    >
      <div className="mb-4">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function CampaignModeToggle({
  mode,
  onModeChange,
}: {
  mode: "audience" | "import";
  onModeChange: (mode: "audience" | "import") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1">
      {(
        [
          { id: "audience" as const, label: "CRM audience", sub: "Filter pipeline contacts" },
          { id: "import" as const, label: "Import CSV", sub: "Upload phone numbers" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onModeChange(opt.id)}
          className={cn(
            "rounded-xl px-3 py-3 text-left transition",
            mode === opt.id
              ? "bg-card text-foreground shadow-sm ring-1 ring-accent/25"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <p className="text-sm font-semibold">{opt.label}</p>
          <p className="mt-0.5 text-[11px] opacity-80">{opt.sub}</p>
        </button>
      ))}
    </div>
  );
}
