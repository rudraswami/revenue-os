import { formatMessage } from "@/lib/i18n/format-message";

export type AssignmentExplainSource = "auto_handoff" | "auto_rule" | "manual" | "takeover";

export interface AssignmentExplain {
  source: AssignmentExplainSource;
  reason?: string | null;
  at: string;
  byUser?: { id: string; name: string | null; email: string } | null;
}

type Translate = (key: string) => string;

function displayName(user: { name: string | null; email: string }): string {
  return user.name?.trim() || user.email;
}

/** Human-readable one-liner for inbox assignment context. */
export function formatAssignmentExplain(
  assignment: AssignmentExplain | null | undefined,
  t: Translate,
): string | null {
  if (!assignment) return null;

  const byName = assignment.byUser ? displayName(assignment.byUser) : null;
  const msg = (key: string, vars?: Record<string, string | number>) => {
    const template = t(key);
    return vars ? formatMessage(template, vars) : template;
  };

  switch (assignment.source) {
    case "auto_handoff": {
      const reason = assignment.reason?.trim();
      if (reason && reason !== "handoff") {
        return msg("conversations.assignmentAutoHandoff", { reason });
      }
      return msg("conversations.assignmentAutoHandoffGeneric");
    }
    case "auto_rule": {
      if (assignment.reason === "new_inbound") {
        return msg("conversations.assignmentAutoNewInbound");
      }
      return msg("conversations.assignmentAutoRule");
    }
    case "takeover":
      return byName
        ? msg("conversations.assignmentTakeover", { name: byName })
        : msg("conversations.assignmentTakeoverGeneric");
    case "manual":
      return byName
        ? msg("conversations.assignmentManual", { name: byName })
        : msg("conversations.assignmentManualGeneric");
    default:
      return null;
  }
}
