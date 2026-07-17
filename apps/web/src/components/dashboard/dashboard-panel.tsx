"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noPadding,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  /** @deprecated Motion delay removed — kept for call-site compatibility. */
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "elev-1 overflow-hidden rounded-2xl bg-card",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 bg-background/60 px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground md:text-sm">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && "p-5", contentClassName)}>{children}</div>
    </div>
  );
}
