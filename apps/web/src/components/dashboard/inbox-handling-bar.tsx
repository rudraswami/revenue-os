"use client";

import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

interface HandlingTeamMember {
  user: { id: string; name: string | null; email: string };
}

/**
 * Single "who is handling this conversation" control for desktop. Merges the
 * former ownership strip + assignment bar into one band so the message area
 * gets more room. Assignment controls only render when the viewer can act on
 * them, so a self-assigned agent sees no redundant chrome.
 */
export function InboxHandlingBar({
  aiEnabled,
  canToggleAi,
  togglePending,
  onTakeOverAi,
  onLetAiAssist,
  assigneeLabel,
  canAssignOthers,
  canTakeOver,
  assignedToId,
  assignPending,
  teamMembers,
  myUserId,
  onAssign,
  className,
}: {
  aiEnabled: boolean;
  canToggleAi: boolean;
  togglePending: boolean;
  onTakeOverAi: () => void;
  onLetAiAssist: () => void;
  assigneeLabel?: string | null;
  canAssignOthers: boolean;
  canTakeOver: boolean;
  assignedToId: string | null;
  assignPending: boolean;
  teamMembers: HandlingTeamMember[];
  myUserId?: string;
  onAssign: (userId: string | null) => void;
  className?: string;
}) {
  const copy = useConversationsCopy();
  const humanOwned = !aiEnabled;

  const ownershipText = humanOwned
    ? assigneeLabel
      ? `${assigneeLabel} · ${copy.handlingThisThread}`
      : copy.handlingThisThread
    : "Growvisi is assisting — you send every customer message";

  const showAssignToMe = !canAssignOthers && canTakeOver && !assignedToId && !!myUserId;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-muted/30 px-4 py-2 lg:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Replying
        </p>
        <p className="truncate text-xs font-medium text-foreground">{ownershipText}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {canAssignOthers ? (
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-2.5 py-1">
            <label htmlFor="assign-agent" className="text-xs font-medium text-muted-foreground">
              {copy.assignedTo}
            </label>
            <select
              id="assign-agent"
              className="max-w-[140px] truncate rounded-md border-0 bg-transparent text-xs font-medium focus:outline-none"
              value={assignedToId ?? ""}
              disabled={assignPending}
              onChange={(e) => {
                const v = e.target.value;
                onAssign(v ? v : null);
              }}
            >
              <option value="">{copy.unassigned}</option>
              {teamMembers.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name ?? m.user.email}
                </option>
              ))}
            </select>
          </div>
        ) : showAssignToMe ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="h-7 rounded-lg text-xs"
            isLoading={assignPending}
            onClick={() => myUserId && onAssign(myUserId)}
          >
            {copy.assignedTo} me
          </Button>
        ) : null}

        {canToggleAi &&
          (humanOwned ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs font-semibold"
              isLoading={togglePending}
              onClick={onLetAiAssist}
            >
              {copy.letGrowvisiHelp}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg bg-warning px-3 text-xs font-semibold text-white hover:bg-warning"
              isLoading={togglePending}
              onClick={onTakeOverAi}
            >
              Take over
            </Button>
          ))}
      </div>
    </div>
  );
}
