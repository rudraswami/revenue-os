"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useSetupSystem } from "@/hooks/use-pending-setup-actions";
import { cn } from "@/lib/utils";

/** Slim progress under Home greeting — only while setup incomplete */
export function SetupProgressStrip() {
  const { progressPercent, status, headline, subhead, nextAction, isLoading, pendingCount } =
    useSetupSystem();

  if (isLoading) return null;
  if (status === "ready") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-6 overflow-hidden rounded-xl border px-4 py-3",
        status === "attention"
          ? "border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-white"
          : "border-[#dce9ff] bg-gradient-to-r from-[#f8f9ff] to-white",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">System setup</p>
            <span className="text-xs font-bold tabular-nums text-muted-foreground">{progressPercent}%</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold">{headline}</p>
          <p className="text-xs text-muted-foreground">{subhead}</p>
        </div>
        {nextAction && (
          <Link
            href={nextAction.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0b1c30] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#132a45]"
          >
            Continue setup
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e5eeff]">
        <motion.div
          className={cn(
            "h-full rounded-full",
            status === "attention" ? "bg-amber-500" : "bg-accent",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      {pendingCount > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {pendingCount} checkpoint{pendingCount === 1 ? "" : "s"} remaining · tap the setup button bottom-right
        </p>
      )}
    </motion.div>
  );
}
