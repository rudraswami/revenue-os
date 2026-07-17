"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsSection({
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
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card elev-1",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-background px-5 py-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && "p-5", contentClassName)}>{children}</div>
    </section>
  );
}

export function SettingsTabLoader({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1">
        <div className="border-b border-border/60 bg-background px-5 py-4">
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
