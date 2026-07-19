"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

export function SelectableTile({
  title,
  description,
  selected = false,
  pending = false,
  disabled = false,
  onClick,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const isDisabled = disabled || (pending && !selected);

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-pressed={selected}
      aria-busy={pending}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2",
        "active:scale-[0.99] motion-reduce:active:scale-100",
        selected
          ? "border-accent/45 bg-bento-mint/55 ring-1 ring-accent/20"
          : "border-border/50 bg-card hover:border-accent/25 hover:bg-bento-mint/15",
        pending && "border-accent/35 bg-bento-mint/25",
        isDisabled && !pending && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {pending ? (
            <GrowvisiSpinner size="xs" />
          ) : selected ? (
            <Check className="h-4 w-4 text-accent" aria-hidden />
          ) : null}
        </span>
      </div>
      {pending ? (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Applying…
        </p>
      ) : null}
    </button>
  );
}
