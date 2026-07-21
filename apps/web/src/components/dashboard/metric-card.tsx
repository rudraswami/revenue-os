"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricVariant = "mint" | "blue" | "amber" | "rose" | "violet" | "slate" | "emerald";

/** Quiet tint tokens — no gradients (Batch B). */
const VARIANT_STYLES: Record<
  MetricVariant,
  { card: string; icon: string; value: string; title: string }
> = {
  mint: {
    card: "border-border bg-card",
    icon: "bg-bento-mint text-accent",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  emerald: {
    card: "border-accent/30 bg-accent text-accent-foreground",
    icon: "bg-card/20 text-white",
    value: "text-white",
    title: "text-white/80",
  },
  blue: {
    card: "border-border bg-card",
    icon: "bg-bento-blue text-primary",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  amber: {
    card: "border-border bg-card",
    icon: "bg-warning/15 text-warning",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  rose: {
    card: "border-border bg-card",
    icon: "bg-rose-100 text-rose-700",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  violet: {
    card: "border-border bg-card",
    icon: "bg-viz-violet/15 text-viz-violet",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  slate: {
    card: "border-border bg-card",
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
};

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: ReactNode;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
  /** @deprecated ignored — motion removed */
  delay?: number;
  variant?: MetricVariant;
  size?: "default" | "large";
  href?: string;
  actionLabel?: string;
  urgent?: boolean;
  muted?: boolean;
  /** @deprecated use variant="mint" */
  highlight?: boolean;
}

export function MetricCard({
  title,
  value,
  delta,
  trend = "neutral",
  icon,
  className,
  variant = "mint",
  size = "default",
  href,
  actionLabel,
  urgent,
  muted,
  highlight,
}: MetricCardProps) {
  const resolvedVariant = highlight && variant === "mint" ? "mint" : variant;
  const v = VARIANT_STYLES[resolvedVariant];
  const isHero = resolvedVariant === "emerald" || size === "large";

  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 elev-1 transition-colors",
        href && "cursor-pointer hover:border-accent/30",
        v.card,
        muted && "opacity-90",
        urgent && resolvedVariant !== "emerald" && "ring-2 ring-rose-300/40",
        className,
      )}
    >
      {urgent && (typeof value === "number" ? value > 0 : value !== "0" && value !== "—") && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
        </span>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-medium", v.title)}>
            {title}
          </p>
          <p
            className={cn(
              "mt-2 font-bold tracking-tight tabular-nums",
              isHero ? "text-4xl md:text-5xl" : "text-3xl",
              v.value,
            )}
          >
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                "mt-2 text-xs leading-relaxed",
                isHero && "text-white/90",
                !isHero && trend === "up" && "text-accent",
                !isHero && trend === "down" && "text-rose-600",
                !isHero && trend === "neutral" && "text-muted-foreground",
              )}
            >
              {delta}
            </p>
          )}
          {href && actionLabel && (
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-xs font-semibold",
                isHero ? "text-white/90" : "text-accent",
              )}
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl",
              isHero ? "h-12 w-12" : "h-11 w-11",
              v.icon,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
