"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LiveCycleBar({
  progress,
  className,
}: {
  progress: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className={cn("live-cycle-track", className)} aria-hidden>
      <div
        className="live-cycle-fill"
        style={{ transform: `scaleX(${Math.min(Math.max(progress, 0), 1)})` }}
      />
    </div>
  );
}
