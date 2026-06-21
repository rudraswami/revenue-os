"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: ReactNode;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
  delay?: number;
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
  highlight,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_4px_16px_rgb(11_28_48/0.04)] transition-shadow hover:shadow-[0_8px_28px_rgb(11_28_48/0.08)]",
        highlight ? "border-accent/25 ring-1 ring-accent/10" : "border-border",
        className,
      )}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/[0.04] transition-transform group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
          {delta && (
            <p
              className={cn(
                "mt-2 text-xs leading-relaxed",
                trend === "up" && "text-accent",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground",
              )}
            >
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bento-mint text-accent transition-colors group-hover:bg-accent group-hover:text-white">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
