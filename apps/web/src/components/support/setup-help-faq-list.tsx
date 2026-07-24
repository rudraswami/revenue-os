"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SetupHelpItem } from "@/lib/setup-help-content";
import { cn } from "@/lib/utils";

type FaqListProps = {
  items: SetupHelpItem[];
  /** Page layout uses larger type and card-style rows. */
  variant?: "compact" | "page";
};

/** Touch-friendly FAQ accordion. */
export function SetupHelpFaqList({ items, variant = "compact" }: FaqListProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const isPage = variant === "page";

  return (
    <div className={cn(isPage ? "space-y-2" : "divide-y divide-border/60")}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div
            key={item.id}
            className={cn(
              isPage
                ? cn(
                    "overflow-hidden rounded-xl border transition-colors",
                    open ? "border-accent/25 bg-bento-mint/30" : "border-border bg-card hover:border-accent/15",
                  )
                : "px-4 py-1",
            )}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
              className={cn(
                "flex w-full touch-manipulation items-center justify-between gap-3 text-left font-medium text-foreground",
                isPage ? "px-4 py-3.5 text-sm" : "min-h-11 py-2 text-sm",
              )}
            >
              <span className="flex-1 leading-snug">{item.question}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180 text-accent",
                )}
                aria-hidden
              />
            </button>
            {open && (
              <p
                className={cn(
                  "leading-relaxed text-muted-foreground",
                  isPage ? "border-t border-border/60 px-4 pb-4 pt-3 text-sm" : "pb-3 text-xs",
                )}
              >
                {item.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
