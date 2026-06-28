"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SetupHelpItem } from "@/lib/setup-help-content";
import { cn } from "@/lib/utils";

/** Touch-friendly FAQ accordion — native `<details>` is unreliable on mobile. */
export function SetupHelpFaqList({ items }: { items: SetupHelpItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="px-4 py-1">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex min-h-11 w-full touch-manipulation items-center justify-between gap-3 py-2 text-left text-sm font-medium text-foreground"
            >
              <span className="flex-1 leading-snug">{item.question}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {open && (
              <p className="pb-3 text-xs leading-relaxed text-muted-foreground">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
