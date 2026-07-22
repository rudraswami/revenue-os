"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  count?: number;
  /** Amber “needs you” treatment when selected */
  attention?: boolean;
  /** Render the option locked/greyed out and non-selectable. */
  disabled?: boolean;
  /** Tooltip explaining why the option is locked (shown on hover/focus). */
  disabledReason?: string;
};

/**
 * Exclusive 2–4 (or short) scope control.
 * Soft selected state — never solid CTA green (reserved for Buttons).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "sm",
  "aria-label": ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-muted/80 p-1 custom-scrollbar",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const locked = !!opt.disabled;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={locked || undefined}
            title={locked ? opt.disabledReason : undefined}
            onClick={() => {
              if (locked) return;
              onChange(opt.value);
            }}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-lg font-medium transition-[color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              size === "sm" && "px-2.5 py-1.5 text-xs",
              size === "md" && "px-3.5 py-2 text-sm",
              locked
                ? "cursor-not-allowed text-muted-foreground/50"
                : active
                  ? opt.attention
                    ? "bg-card text-warning shadow-sm ring-1 ring-warning/30"
                    : "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {locked && <Lock className="h-3 w-3 shrink-0" aria-hidden />}
            {opt.label}
            {opt.count != null && opt.count > 0 ? ` · ${opt.count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
