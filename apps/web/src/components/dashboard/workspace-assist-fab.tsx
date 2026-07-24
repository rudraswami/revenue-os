"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  CreditCard,
  ListChecks,
  MessageCircle,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { usePendingSetupActions, type SetupAction } from "@/hooks/use-pending-setup-actions";
import { useActivationMilestoneTracking } from "@/hooks/use-activation-milestone-tracking";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatMessage } from "@/lib/i18n/format-message";
import { cn } from "@/lib/utils";

const AUTO_COLLAPSE_MS = 12_000;

/** Hide floating assist on help (full-page focus). Inbox uses left-side FAB so composer stays clear. */
const HIDE_ASSIST_PATHS = [/^\/dashboard\/help(?:\/|$)/];

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
  "webhook-delivery": Wifi,
  "first-inbound": MessageCircle,
  "ai-classify": Sparkles,
  "pipeline-move": Zap,
  "coach-digest": Users,
  "coach-invite": Users,
  "coach-takeover": UserRound,
  "agency-add-client": Building2,
  "agency-connect": MessageCircle,
  "agency-reconnect": AlertTriangle,
};

function actionIcon(action: SetupAction) {
  return ACTION_ICONS[action.id] ?? Settings2;
}

function FeaturedSetupCard({ action }: { action: SetupAction }) {
  const Icon = actionIcon(action);
  return (
    <Link
      href={action.href}
      className={cn(
        "group mx-2 mt-2 block rounded-xl border p-3.5 transition-colors",
        action.priority === "critical"
          ? "border-warning/30 bg-warning/10 hover:bg-warning/15"
          : "border-accent/25 bg-bento-mint/50 hover:bg-bento-mint",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            action.priority === "critical" ? "bg-warning/20 text-warning" : "bg-accent text-white",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Up next</p>
          <p className="mt-0.5 text-sm font-bold leading-snug">{action.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:gap-1.5">
            Continue
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SetupRow({ action }: { action: SetupAction }) {
  const Icon = actionIcon(action);
  return (
    <li>
      <Link
        href={action.href}
        className={cn(
          "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-background",
          action.priority === "critical" && "bg-warning/10 hover:bg-warning/10",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            action.priority === "critical"
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground group-hover:bg-bento-mint group-hover:text-accent",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
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

function ActivationProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>Activation</span>
        <span>
          {completed}/{total} · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Setup-only floating assist — visible only while blocking setup tasks remain.
 * Help & AI support lives at /dashboard/help (sidebar + Connection page).
 */
export function WorkspaceAssistFab() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";

  useActivationMilestoneTracking();
  const {
    actions,
    criticalCount,
    totalCount,
    allComplete,
    opsStage,
    isLoading,
    isAgency,
    featuredAction,
    activation,
  } = usePendingSetupActions();
  const showSetup = !isLoading && !allComplete && totalCount > 0;
  const stageHint = isAgency
    ? "Portfolio needs attention"
    : opsStage && OPS_STAGE_HINT[opsStage]
      ? OPS_STAGE_HINT[opsStage]
      : t("setupDock.subtitle");
  const restActions = featuredAction ? actions.filter((a) => a.id !== featuredAction.id) : actions;

  const [expanded, setExpanded] = useState(false);
  const pinnedRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoOpen = useRef(false);

  const hiddenByPath = HIDE_ASSIST_PATHS.some((re) => re.test(pathname));
  const onInbox = /^\/dashboard\/inbox(?:\/|$)/.test(pathname);
  const visible = !hiddenByPath && showSetup;

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (pinnedRef.current || criticalCount > 0) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), AUTO_COLLAPSE_MS);
  }, [criticalCount]);

  useEffect(() => {
    if (!showSetup || isLoading || didAutoOpen.current || hiddenByPath) return;
    didAutoOpen.current = true;
    setExpanded(true);
    scheduleCollapse();
  }, [showSetup, isLoading, hiddenByPath, scheduleCollapse]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  if (!visible) return null;

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    pinnedRef.current = next;
    if (next) scheduleCollapse();
    else if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }

  const settingsHref = isAgency ? "/dashboard/agency" : "/dashboard/settings?tab=whatsapp";
  const settingsLabel = isAgency ? "Open agency hub" : t("setupDock.openSettings");

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-5 z-[55] flex flex-col gap-2 sm:bottom-6",
        onInbox
          ? "left-5 items-start sm:left-6"
          : "right-5 items-end sm:right-6",
      )}
      data-assist-mode="setup"
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
          <div className="border-b border-border/80 bg-background px-4 py-3.5">
            <p className="text-xs font-medium text-accent">{t("setupDock.eyebrow")}</p>
            <p className="text-sm font-bold">
              {totalCount === 1
                ? t("setupDock.stepsOne")
                : formatMessage(t("setupDock.stepsMany"), { count: totalCount })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stageHint}</p>
            {!isAgency && activation.inActivation ? (
              <ActivationProgressBar completed={activation.completed} total={activation.total} />
            ) : null}
          </div>

          {featuredAction ? <FeaturedSetupCard action={featuredAction} /> : null}

          {restActions.length > 0 ? (
            <>
              {featuredAction ? (
                <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Also on your list
                </p>
              ) : null}
              <ul className="max-h-[min(40vh,240px)] overflow-y-auto p-2 custom-scrollbar">
                {restActions.map((action) => (
                  <SetupRow key={action.id} action={action} />
                ))}
              </ul>
            </>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-border/80 px-4 py-2.5">
            <Link href={settingsHref} className="text-xs font-semibold text-accent hover:underline">
              {settingsLabel}
            </Link>
            <Link
              href="/dashboard/help"
              className="text-xs font-semibold text-muted-foreground hover:text-accent"
            >
              {t("setupDock.getHelp")}
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_32px_rgb(11_158_109/0.45)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          criticalCount > 0 && !expanded && "animate-pulse ring-2 ring-warning/30 ring-offset-2",
        )}
        aria-expanded={expanded}
        aria-label={expanded ? t("setupDock.close") : t("setupDock.open")}
      >
        <ListChecks className="h-5 w-5" strokeWidth={2} />
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white",
            criticalCount > 0 ? "bg-warning" : "bg-accent ring-2 ring-card",
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
      </button>
    </div>
  );
}
