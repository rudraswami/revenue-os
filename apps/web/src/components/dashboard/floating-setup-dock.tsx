"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  CreditCard,
  MessageCircle,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import { SetupHelpPanel } from "@/components/support/setup-help-panel";
import { usePendingSetupActions, type SetupAction } from "@/hooks/use-pending-setup-actions";
import type { HelpFabContext } from "@/lib/setup-help-content";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatMessage } from "@/lib/i18n/format-message";
import { cn } from "@/lib/utils";

const AUTO_COLLAPSE_MS = 12_000;

type DockView = "setup" | "help";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "trial-ended": CreditCard,
  "trial-ending": CreditCard,
  "connect-whatsapp": MessageCircle,
  "token-refresh": AlertTriangle,
  "first-inbound": MessageCircle,
  "ai-classify": Sparkles,
  "pipeline-move": Zap,
  "enable-digest": Bell,
  "razorpay-webhook": CreditCard,
  "auto-win": CreditCard,
};

function SetupRow({ action, index }: { action: SetupAction; index: number }) {
  const Icon = ACTION_ICONS[action.id] ?? Settings2;
  return (
    <motion.li
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={action.href}
        className={cn(
          "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f8f9ff]",
          action.priority === "critical" && "bg-amber-50/90 hover:bg-amber-50",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            action.priority === "critical"
              ? "bg-amber-100 text-amber-800"
              : "bg-bento-mint text-accent group-hover:bg-accent group-hover:text-white",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{action.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
        </div>
        <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
      </Link>
    </motion.li>
  );
}

/** Pending workspace setup — hides when everything is complete. Includes help tab. */
export function FloatingSetupDock({ helpContext }: { helpContext: HelpFabContext }) {
  const { t } = useI18n();
  const { actions, criticalCount, totalCount, allComplete, isLoading } = usePendingSetupActions();
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<DockView>("setup");
  const pinnedRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoOpen = useRef(false);

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (pinnedRef.current || criticalCount > 0) return;
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      setView("setup");
    }, AUTO_COLLAPSE_MS);
  }, [criticalCount]);

  useEffect(() => {
    if (allComplete || isLoading || didAutoOpen.current) return;
    didAutoOpen.current = true;
    setExpanded(true);
    scheduleCollapse();
  }, [allComplete, isLoading, scheduleCollapse]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (!next) setView("setup");
    pinnedRef.current = next;
    if (next) scheduleCollapse();
    else if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }

  function openHelp() {
    setView("help");
    setExpanded(true);
    pinnedRef.current = true;
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }

  if (isLoading || allComplete) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-[min(100vw-2.5rem,380px)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgb(11_28_48/0.16)]"
            onMouseEnter={() => {
              if (collapseTimer.current) clearTimeout(collapseTimer.current);
            }}
            onMouseLeave={() => {
              if (expanded && !pinnedRef.current) scheduleCollapse();
            }}
          >
            {view === "setup" ? (
              <>
                <div className="border-b border-border/80 bg-gradient-to-r from-bento-mint/40 to-white px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {t("setupDock.eyebrow")}
                  </p>
                  <p className="text-sm font-bold">
                    {totalCount === 1
                      ? t("setupDock.stepsOne")
                      : formatMessage(t("setupDock.stepsMany"), { count: totalCount })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("setupDock.subtitle")}</p>
                </div>
                <ul className="max-h-[min(50vh,320px)] overflow-y-auto p-2 custom-scrollbar">
                  {actions.map((action, i) => (
                    <SetupRow key={action.id} action={action} index={i} />
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-2 border-t border-border/80 px-4 py-2.5">
                  <Link
                    href="/dashboard/settings?tab=whatsapp"
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {t("setupDock.openSettings")}
                  </Link>
                  <button
                    type="button"
                    onClick={openHelp}
                    className="text-xs font-semibold text-muted-foreground hover:text-accent"
                  >
                    {t("setupDock.getHelp")}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center gap-2 border-b border-border/80 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setView("setup")}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("setupDock.backToSteps")}
                  </button>
                </div>
                <SetupHelpPanel context={helpContext} showHeader={false} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggle}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_32px_rgb(11_158_109/0.45)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          criticalCount > 0 && !expanded && "animate-pulse ring-2 ring-amber-400 ring-offset-2",
        )}
        whileTap={{ scale: 0.94 }}
        aria-expanded={expanded}
        aria-label={expanded ? t("setupDock.close") : t("setupDock.open")}
      >
        <Settings2 className="h-5 w-5" strokeWidth={2} />
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
            criticalCount > 0 ? "bg-amber-500" : "bg-accent",
          )}
        >
          {totalCount > 99 ? "99+" : totalCount}
        </span>
        <ChevronDown
          className={cn(
            "absolute bottom-1.5 h-3 w-3 opacity-80 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </motion.button>
    </div>
  );
}
