/** Build a WhatsApp-style quoted reply prefix for the composer. */
export function formatQuotedReply(text: string, maxLen = 240): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const excerpt =
    normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1)}…` : normalized;
  return `> ${excerpt}\n\n`;
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
