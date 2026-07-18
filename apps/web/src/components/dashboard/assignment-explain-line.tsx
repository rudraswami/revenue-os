"use client";

import Link from "next/link";
import { Bot, UserRound } from "lucide-react";
import { formatAssignmentExplain, type AssignmentExplain } from "@/lib/assignment-explain";
import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function AssignmentExplainLine({
  assignment,
  className,
  showRulesLink = false,
}: {
  assignment: AssignmentExplain | null | undefined;
  className?: string;
  showRulesLink?: boolean;
}) {
  const { t } = useI18n();
  const text = formatAssignmentExplain(assignment, t);
  if (!text) return null;

  const isAuto =
    assignment?.source === "auto_handoff" || assignment?.source === "auto_rule";
  const Icon = isAuto ? Bot : UserRound;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 text-xs leading-snug text-muted-foreground",
        className,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/80" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{text}</p>
        {showRulesLink && isAuto && (
          <Link
            href="/dashboard/settings?tab=team#assignment-rules"
            className="mt-1 inline-flex font-semibold text-accent hover:underline"
          >
            {t("conversations.assignmentRulesLink")}
          </Link>
        )}
      </div>
    </div>
  );
}
