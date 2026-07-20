const PREFIX = "gv:inbox-draft:";

export type InboxDraftMeta = {
  aiRunId?: string;
  sources: Array<{ title: string; citation?: string; similarity: number }>;
};

export type InboxDraftSnapshot = {
  text: string;
  meta: InboxDraftMeta | null;
};

export function loadInboxDraft(conversationId: string): InboxDraftSnapshot | null {
  if (typeof globalThis.sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${conversationId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InboxDraftSnapshot;
    if (typeof parsed.text !== "string") return null;
    return { text: parsed.text, meta: parsed.meta ?? null };
  } catch {
    return null;
  }
}

export function saveInboxDraft(conversationId: string, snapshot: InboxDraftSnapshot): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  try {
    if (!snapshot.text.trim() && !snapshot.meta) {
      sessionStorage.removeItem(`${PREFIX}${conversationId}`);
      return;
    }
    sessionStorage.setItem(`${PREFIX}${conversationId}`, JSON.stringify(snapshot));
  } catch {
    /* quota or private mode */
  }
}

export function clearInboxDraft(conversationId: string): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(`${PREFIX}${conversationId}`);
  } catch {
    /* ignore */
  }
}
