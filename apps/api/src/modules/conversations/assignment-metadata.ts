export type AssignmentSource = "auto_handoff" | "auto_rule" | "manual" | "takeover";

export interface ConversationAssignmentMeta {
  source: AssignmentSource;
  reason?: string | null;
  at: string;
  byUserId?: string | null;
}

export function parseAssignmentMeta(metadata: unknown): ConversationAssignmentMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).assignment;
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const source = a.source;
  if (
    source !== "auto_handoff" &&
    source !== "auto_rule" &&
    source !== "manual" &&
    source !== "takeover"
  ) {
    return null;
  }
  const at = typeof a.at === "string" ? a.at : null;
  if (!at) return null;
  return {
    source,
    reason: typeof a.reason === "string" ? a.reason : null,
    at,
    byUserId: typeof a.byUserId === "string" ? a.byUserId : null,
  };
}

export function withAssignmentMeta(
  existing: Record<string, unknown>,
  assignment: ConversationAssignmentMeta,
): Record<string, unknown> {
  return { ...existing, assignment };
}

export function clearAssignmentMeta(existing: Record<string, unknown>): Record<string, unknown> {
  const next = { ...existing };
  delete next.assignment;
  return next;
}
