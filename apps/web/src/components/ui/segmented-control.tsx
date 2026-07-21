"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  count?: number;
  /** Amber “needs you” treatment when selected */
  attention?: boolean;
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
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 rounded-lg font-medium transition-[color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              size === "sm" && "px-2.5 py-1.5 text-xs",
              size === "md" && "px-3.5 py-2 text-sm",
              active
                ? opt.attention
                  ? "bg-card text-warning shadow-sm ring-1 ring-warning/30"
                  : "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            {opt.count != null && opt.count > 0 ? ` · ${opt.count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
