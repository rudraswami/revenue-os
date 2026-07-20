/** Build a WhatsApp-style quoted reply prefix for the composer. */
export function formatQuotedReply(text: string, maxLen = 240): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const excerpt =
    normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1)}…` : normalized;
  return `> ${excerpt}\n\n`;
}

/** Split a composer draft into an optional quote block and reply body. */
export function parseQuotedReply(draft: string): { quote: string | null; body: string } {
  const match = draft.match(/^> (.+?)\n\n([\s\S]*)$/);
  if (!match) return { quote: null, body: draft };
  return { quote: match[1], body: match[2] };
}

/** Remove a leading quote block from the composer draft. */
export function stripQuotedReply(draft: string): string {
  return parseQuotedReply(draft).body;
}

/** Insert text at a textarea selection and return the next value + cursor. */
export function insertAtCursor(
  value: string,
  insert: string,
  selectionStart: number,
  selectionEnd: number,
): { next: string; cursor: number } {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const next = before + insert + after;
  return { next, cursor: selectionStart + insert.length };
}

/** Apply a quick-reply template while preserving any quote block prefix. */
export function applyTemplateToDraft(draft: string, templateBody: string): string {
  const { quote } = parseQuotedReply(draft);
  const prefix = quote ? formatQuotedReply(quote) : "";
  return prefix + templateBody;
}

/** Match reply templates when the composer starts with `/`. */
export function filterSlashTemplates(
  draft: string,
  templates: Array<{ id: string; title: string; body: string }>,
): Array<{ id: string; title: string; body: string }> {
  if (!draft.startsWith("/")) return [];
  const q = draft.slice(1).trim().toLowerCase();
  if (!q) return templates.slice(0, 8);
  return templates
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q),
    )
    .slice(0, 8);
}
