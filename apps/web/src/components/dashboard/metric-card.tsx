"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricVariant = "mint" | "blue" | "amber" | "rose" | "violet" | "slate" | "emerald";

const VARIANT_STYLES: Record<
  MetricVariant,
  { card: string; icon: string; glow: string; value: string }
> = {
  mint: {
    card: "border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/90",
    icon: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
    glow: "bg-emerald-400/10",
    value: "text-emerald-950",
  },
  emerald: {
    card: "border-emerald-300/60 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-[0_12px_40px_rgb(5_150_105/0.25)]",
    icon: "bg-white/20 text-white",
    glow: "bg-white/10",
    value: "text-white",
  },
  blue: {
    card: "border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/90",
    icon: "bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
    glow: "bg-sky-400/10",
    value: "text-sky-950",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/90",
    icon: "bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-white",
    glow: "bg-amber-400/10",
    value: "text-amber-950",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-white via-rose-50/50 to-rose-50/90",
    icon: "bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white",
    glow: "bg-rose-400/10",
    value: "text-rose-950",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-br from-white via-white to-violet-50/90",
    icon: "bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
    glow: "bg-violet-400/10",
    value: "text-violet-950",
  },
  slate: {
    card: "border-border bg-white",
    icon: "bg-muted text-muted-foreground group-hover:bg-slate-700 group-hover:text-white",
    glow: "bg-slate-400/5",
    value: "text-foreground",
  },
};

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: ReactNode;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
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
  delay = 0,
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={href ? { y: -3 } : undefined}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 shadow-[0_4px_16px_rgb(11_28_48/0.04)] transition-shadow",
        href && "cursor-pointer hover:shadow-[0_12px_32px_rgb(11_28_48/0.1)]",
        v.card,
        muted && "opacity-90",
        urgent && resolvedVariant !== "emerald" && "ring-2 ring-rose-300/50",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full transition-transform group-hover:scale-110",
          v.glow,
        )}
      />
      {urgent && (typeof value === "number" ? value > 0 : value !== "0" && value !== "—") && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
        </span>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              isHero ? "text-emerald-100" : "text-muted-foreground",
            )}
          >
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
                isHero && "text-emerald-50/90",
                !isHero && trend === "up" && "text-emerald-700",
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
              "flex shrink-0 items-center justify-center rounded-xl transition-colors",
              isHero ? "h-12 w-12" : "h-11 w-11",
              v.icon,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
