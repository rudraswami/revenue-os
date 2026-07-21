"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  CreditCard,
  HelpCircle,
  ListChecks,
  MessageCircle,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { SetupHelpPanel } from "@/components/support/setup-help-panel";
import { usePendingSetupActions, type SetupAction } from "@/hooks/use-pending-setup-actions";
import { useActivationMilestoneTracking } from "@/hooks/use-activation-milestone-tracking";
import { resolveHelpContext, type HelpFabContext } from "@/lib/setup-help-content";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatMessage } from "@/lib/i18n/format-message";
import { trackCoaching } from "@/lib/coaching-analytics";
import { cn } from "@/lib/utils";

const AUTO_COLLAPSE_MS = 12_000;

/** Never show a floating assist on these routes (composer / focus surfaces). */
const HIDE_ASSIST_PATHS = [/^\/dashboard\/inbox(?:\/|$)/];

/** After setup is complete, help FAB only on these surfaces (+ ?assist=help deep-link). */
const HELP_SURFACE_PATHS = [/^\/dashboard\/connection(?:\/|$)/, /^\/dashboard\/pricing(?:\/|$)/];

type PanelView = "setup" | "help";

const OPS_STAGE_HINT: Record<string, string> = {
  setup: "Connect WhatsApp to start",
  activating: "Get first AI classify",
  activated: "Take one pipeline action",
  acting: "Convert while value is fresh",
  paying: "Paying workspace",
  at_risk: "Trial ending — pick a plan",
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "trial-ended": CreditCard,
  "trial-ending": CreditCard,
  "limit-seats": CreditCard,
  "limit-whatsapp": CreditCard,
  "limit-leads": CreditCard,
  "connect-whatsapp": MessageCircle,
  "token-refresh": AlertTriangle,
  "first-inbound": MessageCircle,
  "ai-classify": Sparkles,
  "pipeline-move": Zap,
  "enable-digest": Bell,
  "coach-digest": Bell,
  "coach-invite": Users,
  "coach-takeover": UserRound,
  "razorpay-webhook": CreditCard,
  "auto-win": CreditCard,
};

function SetupRow({ action }: { action: SetupAction }) {
  const Icon = ACTION_ICONS[action.id] ?? Settings2;
  return (
    <li>
      <Link
        href={action.href}
        onClick={() => {
          if (action.id.startsWith("coach-")) {
            trackCoaching("coaching_next_click", { step: action.id.replace("coach-", "") });
          }
        }}
        className={cn(
          "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-background",
          action.priority === "critical" && "bg-warning/10 hover:bg-warning/10",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            action.priority === "critical"
              ? "bg-warning/15 text-warning"
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
    </li>
  );
}

function isHelpSurfacePath(pathname: string, settingsTab: string | null): boolean {
  if (HELP_SURFACE_PATHS.some((re) => re.test(pathname))) return true;
  return pathname.startsWith("/dashboard/settings") && settingsTab === "whatsapp";
}

/**
 * Single floating assist control for the dashboard.
 * Setup checklist while milestones are incomplete; contextual help after — never two FABs.
 */
export function WorkspaceAssistFab() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const settingsTab = searchParams.get("tab");
  const assistDeepLink = searchParams.get("assist") === "help";
  const helpContext: HelpFabContext = resolveHelpContext(pathname, settingsTab) ?? "general";

  useActivationMilestoneTracking();
  const { actions, criticalCount, totalCount, allComplete, opsStage, isLoading } =
    usePendingSetupActions();
  const showSetup = !isLoading && !allComplete && totalCount > 0;
  const stageHint =
    opsStage && OPS_STAGE_HINT[opsStage] ? OPS_STAGE_HINT[opsStage] : t("setupDock.subtitle");
  const coachAction = actions.find((a) => a.id.startsWith("coach-"));

  useEffect(() => {
    if (!coachAction) return;
    trackCoaching("coaching_next_view", { step: coachAction.id.replace("coach-", "") });
  }, [coachAction?.id]);

  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<PanelView>("setup");
  const pinnedRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoOpen = useRef(false);

  const hiddenByPath = HIDE_ASSIST_PATHS.some((re) => re.test(pathname));
  const helpSurface = isHelpSurfacePath(pathname, settingsTab);
  const visible = !hiddenByPath && (showSetup || helpSurface || assistDeepLink);

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (pinnedRef.current || criticalCount > 0 || assistDeepLink) return;
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      setView(showSetup ? "setup" : "help");
    }, AUTO_COLLAPSE_MS);
  }, [assistDeepLink, criticalCount, showSetup]);

  useEffect(() => {
    if (assistDeepLink) {
      setView("help");
      setExpanded(true);
      pinnedRef.current = true;
    }
  }, [assistDeepLink]);

  useEffect(() => {
    if (!showSetup || isLoading || didAutoOpen.current || hiddenByPath) return;
    didAutoOpen.current = true;
    setView("setup");
    setExpanded(true);
    scheduleCollapse();
  }, [showSetup, isLoading, hiddenByPath, scheduleCollapse]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!showSetup && view === "setup") setView("help");
  }, [showSetup, view]);

  if (!visible) return null;

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (!next) setView(showSetup ? "setup" : "help");
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

  const FabIcon = showSetup ? ListChecks : HelpCircle;
  const fabLabel = expanded
    ? showSetup
      ? t("setupDock.close")
      : t("setupHelp.closeHelp")
    : showSetup
      ? t("setupDock.open")
      : t("setupHelp.openHelp");

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
      data-assist-mode={showSetup ? "setup" : "help"}
    >
      {expanded && (
          <div
            className="pointer-events-auto w-[min(100vw-2.5rem,380px)] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgb(11_28_48/0.16)]"
            onMouseEnter={() => {
              if (collapseTimer.current) clearTimeout(collapseTimer.current);
            }}
            onMouseLeave={() => {
              if (expanded && !pinnedRef.current) scheduleCollapse();
            }}
          >
            {view === "setup" && showSetup ? (
              <>
                <div className="border-b border-border/80 bg-background px-4 py-3.5">
                  <p className="text-xs font-medium text-accent">
                    {t("setupDock.eyebrow")}
                  </p>
                  <p className="text-sm font-bold">
                    {totalCount === 1
                      ? t("setupDock.stepsOne")
                      : formatMessage(t("setupDock.stepsMany"), { count: totalCount })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stageHint}</p>
                </div>
                <ul className="max-h-[min(50vh,320px)] overflow-y-auto p-2 custom-scrollbar">
                  {actions.map((action) => (
                    <SetupRow key={action.id} action={action} />
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
                {showSetup && (
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
                )}
                <SetupHelpPanel
                  context={helpContext}
                  showHeader={!showSetup}
                  onClose={showSetup ? undefined : () => setExpanded(false)}
                />
              </div>
            )}
          </div>
      )}

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 touch-manipulation items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgb(11_158_109/0.45)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          showSetup
            ? "bg-accent hover:bg-accent-hover"
            : "border-2 border-accent/20 bg-card text-accent hover:bg-bento-mint",
          showSetup && criticalCount > 0 && !expanded && "animate-pulse ring-2 ring-warning/30 ring-offset-2",
          !showSetup && expanded && "ring-2 ring-accent/30 ring-offset-2",
        )}
        aria-expanded={expanded}
        aria-label={fabLabel}
      >
        <FabIcon className="h-5 w-5" strokeWidth={2} />
        {showSetup && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white",
              criticalCount > 0 ? "bg-warning" : "bg-accent",
            )}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "absolute bottom-1.5 h-3 w-3 opacity-80 transition-transform",
            expanded && "rotate-180",
            !showSetup && "text-accent",
          )}
        />
      </button>
    </div>
  );
}
