"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
  badge?: ReactNode;
  className?: string;
}

/** Canonical page chrome: eyebrow → title → description → action. */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn("mb-8 flex flex-wrap items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
