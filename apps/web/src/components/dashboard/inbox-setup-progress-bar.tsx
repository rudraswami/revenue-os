"use client";

import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { usePendingSetupActions } from "@/hooks/use-pending-setup-actions";
import { cn } from "@/lib/utils";

/**
 * Slim activation progress on Inbox — FAB is hidden there to protect the composer.
 */
export function InboxSetupProgressBar() {
  const { actions, totalCount, allComplete, isLoading, featuredAction, activation } =
    usePendingSetupActions();

  if (isLoading || allComplete || totalCount === 0 || !featuredAction) return null;

  const label =
    activation.inActivation && activation.completed < activation.total
      ? `${activation.completed} of ${activation.total} activation steps`
      : `${totalCount} setup step${totalCount === 1 ? "" : "s"} left`;

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
        featuredAction.priority === "critical"
          ? "border-warning/30 bg-warning/5"
          : "border-accent/20 bg-bento-mint/40",
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold leading-snug text-foreground">{featuredAction.title}</p>
        </div>
      </div>
      <Link
        href={featuredAction.href}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
      >
        Continue
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
