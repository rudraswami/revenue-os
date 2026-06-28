"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

export function OnboardingStepper({
  steps,
  className,
}: {
  steps: OnboardingStep[];
  className?: string;
}) {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-1 sm:gap-0", className)}
      aria-label="Setup progress"
    >
      {steps.map((step, i) => (
        <li key={step.id} className="flex items-center">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
              step.done
                ? "text-[#128C7E]"
                : step.current
                  ? "bg-[#0b1c30] text-white shadow-sm"
                  : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                step.done
                  ? "bg-[#ecfdf5] text-[#128C7E]"
                  : step.current
                    ? "bg-white/15 text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-1 hidden h-px w-6 sm:block md:w-10",
                step.done ? "bg-[#6cf8bb]/60" : "bg-border",
              )}
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}
