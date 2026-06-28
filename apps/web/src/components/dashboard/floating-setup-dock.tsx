"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle, Loader2, Zap } from "lucide-react";
import { useSetupSystem, type SetupMilestone, type SetupPhase } from "@/hooks/use-pending-setup-actions";
import { cn } from "@/lib/utils";

const AUTO_COLLAPSE_MS = 14_000;
const RE_NUDGE_MS = 4 * 60_000;

function ProgressRing({
  percent,
  attention,
  ready,
  size = 56,
}: {
  percent: number;
  attention: boolean;
  ready: boolean;
  size?: number;
}) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgb(255 255 255 / 0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ready ? "#6cf8bb" : attention ? "#fbbf24" : "#0b9e6d"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

function PhaseBlock({ phase }: { phase: SetupPhase }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{phase.label}</p>
          <p className="text-[10px] text-white/35">{phase.tagline}</p>
        </div>
        {phase.complete && <CheckCircle2 className="h-4 w-4 text-[#6cf8bb]" />}
      </div>
      <ul className="space-y-0.5">
        {phase.milestones.map((m) => (
          <MilestoneRow key={m.id} milestone={m} />
        ))}
      </ul>
    </div>
  );
}

function MilestoneRow({ milestone: m }: { milestone: SetupMilestone }) {
  const isCurrent = m.status === "current";
  const isComplete = m.status === "complete";

  const row = (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors",
        isCurrent && "bg-white/10 ring-1 ring-[#6cf8bb]/40",
        !isCurrent && !isComplete && "opacity-75",
      )}
    >
      {isComplete ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6cf8bb]" />
      ) : isCurrent ? (
        <span className="relative mt-1 flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6cf8bb] opacity-50" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#6cf8bb]" />
        </span>
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] font-semibold leading-snug", isComplete ? "text-white/60" : "text-white")}>
          {m.label}
        </p>
        {isCurrent && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">{m.description}</p>
        )}
      </div>
      {isCurrent && (
        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#6cf8bb]" />
      )}
    </div>
  );

  if (isCurrent || (m.critical && !isComplete)) {
    return (
      <li>
        <Link href={m.href} className="block rounded-lg hover:bg-white/5">
          {row}
        </Link>
      </li>
    );
  }

  return <li>{row}</li>;
}

/**
 * Proactive system setup dock — full Revenue OS checklist, always visible until 100%.
 */
export function FloatingSetupDock() {
  const {
    phases,
    progressPercent,
    pendingCount,
    criticalCount,
    nextAction,
    status,
    headline,
    subhead,
    isLoading,
  } = useSetupSystem();

  const [expanded, setExpanded] = useState(false);
  const pinnedRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCritical = useRef(0);
  const lastNudge = useRef(0);
  const ready = status === "ready";

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (pinnedRef.current) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), AUTO_COLLAPSE_MS);
  }, []);

  const proactiveExpand = useCallback(() => {
    if (pinnedRef.current) return;
    setExpanded(true);
    scheduleCollapse();
  }, [scheduleCollapse]);

  // Auto-open on load when incomplete
  useEffect(() => {
    if (isLoading || ready) return;
    proactiveExpand();
  }, [isLoading, ready, proactiveExpand]);

  // Re-open when new critical item appears
  useEffect(() => {
    if (criticalCount > prevCritical.current && criticalCount > 0) {
      proactiveExpand();
    }
    prevCritical.current = criticalCount;
  }, [criticalCount, proactiveExpand]);

  // Periodic nudge every 4 min if still incomplete
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastNudge.current > RE_NUDGE_MS && !expanded && !pinnedRef.current) {
        lastNudge.current = now;
        proactiveExpand();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [ready, expanded, proactiveExpand]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    pinnedRef.current = next;
    if (next) scheduleCollapse();
    else if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="pointer-events-auto w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1c30] text-white shadow-[0_24px_80px_rgb(11_28_48/0.45)]"
            onMouseEnter={() => {
              if (collapseTimer.current) clearTimeout(collapseTimer.current);
            }}
            onMouseLeave={() => {
              if (expanded && !pinnedRef.current) scheduleCollapse();
            }}
          >
            {/* Header */}
            <div className="border-b border-white/10 bg-gradient-to-br from-[#132a45] to-[#0b1c30] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6cf8bb]">
                    Growvisi Revenue OS
                  </p>
                  <p className="mt-1 text-base font-bold leading-tight">{headline}</p>
                  <p className="mt-1 text-xs text-white/55">{subhead}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-[#6cf8bb]">{progressPercent}%</p>
                  <p className="text-[10px] text-white/40">configured</p>
                </div>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    status === "attention" ? "bg-amber-400" : "bg-[#6cf8bb]",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              {nextAction && !ready && (
                <Link
                  href={nextAction.href}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6cf8bb] px-4 py-2.5 text-sm font-bold text-[#0b1c30] transition hover:brightness-105"
                >
                  {nextAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {/* Phases */}
            <div className="max-h-[min(50vh,360px)] overflow-y-auto px-3 py-3 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-white/50">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                phases.map((phase) => <PhaseBlock key={phase.id} phase={phase} />)
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-2.5">
              <Link href="/dashboard/settings" className="text-xs font-semibold text-[#6cf8bb] hover:underline">
                All settings →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — always visible */}
      <motion.button
        type="button"
        onClick={toggle}
        className={cn(
          "pointer-events-auto relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-[#0b1c30] text-white shadow-[0_12px_40px_rgb(11_28_48/0.4)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6cf8bb]/50",
          !ready && status === "attention" && !expanded && "animate-[pulse_2.5s_ease-in-out_infinite]",
          !ready && !expanded && "ring-2 ring-offset-2 ring-offset-background",
          !ready && status === "attention" && !expanded && "ring-amber-400",
          !ready && status !== "attention" && !expanded && "ring-accent/30",
          ready && "ring-2 ring-[#6cf8bb]/50 ring-offset-2 ring-offset-background",
        )}
        whileTap={{ scale: 0.92 }}
        aria-expanded={expanded}
        aria-label={expanded ? "Close system setup" : "Open system setup"}
      >
        <ProgressRing percent={progressPercent} attention={status === "attention"} ready={ready} />
        <div className="relative flex flex-col items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#6cf8bb]" />
          ) : ready ? (
            <CheckCircle2 className="h-6 w-6 text-[#6cf8bb]" strokeWidth={2.25} />
          ) : (
            <>
              <Zap className="h-4 w-4 text-[#6cf8bb]" strokeWidth={2.5} />
              <span className="mt-0.5 text-[10px] font-bold tabular-nums leading-none">
                {progressPercent}%
              </span>
            </>
          )}
        </div>
        {!ready && pendingCount > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
              status === "attention" ? "bg-amber-500 text-[#0b1c30]" : "bg-[#6cf8bb] text-[#0b1c30]",
            )}
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
