"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

/** Compact single-row stepper — app tokens, never wraps. */
export function OnboardingStepper({
  steps,
  className,
}: {
  steps: OnboardingStep[];
  className?: string;
}) {
  return (
    <ol
      className={cn("flex flex-nowrap items-center justify-center gap-0", className)}
      aria-label="Setup progress"
    >
      {steps.map((step, i) => (
        <li key={step.id} className="flex items-center">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors duration-300 sm:gap-2 sm:px-2.5 sm:text-xs",
              step.done && "text-accent",
              step.current && "bg-primary text-primary-foreground",
              !step.done && !step.current && "text-muted-foreground/70",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                step.done && "bg-bento-mint text-accent",
                step.current && "bg-white/20 text-primary-foreground",
                !step.done && !step.current && "bg-muted text-muted-foreground",
              )}
            >
              {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className="whitespace-nowrap font-sans">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-1.5 h-px w-4 shrink-0 sm:mx-2 sm:w-8",
                step.done ? "bg-accent/40" : "bg-border",
              )}
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}
