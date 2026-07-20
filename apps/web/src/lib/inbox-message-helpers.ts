/** Text suitable for clipboard copy — skips bare media placeholders. */
export function getCopyableMessageText(content: string | null): string | null {
  if (!content?.trim()) return null;
  const trimmed = content.trim();
  if (/^\[[^\]]+\]$/.test(trimmed)) return null;

  const mediaPrefix = /^(Image|Document|Video|Voice message|Sticker): /;
  if (mediaPrefix.test(trimmed)) {
    const rest = trimmed.replace(mediaPrefix, "").trim();
    return rest || null;
  }

  return trimmed;
}

/** Suggested download filename for inbox message media. */
export function inferInboxMediaFilename(
  content: string | null,
  type: string,
  messageId: string,
): string {
  const shortId = messageId.slice(0, 8);

  if (type === "DOCUMENT") {
    const fromContent = content?.match(/^Document:\s*(.+)$/i);
    const name = fromContent?.[1]?.trim();
    if (name) return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
    return `document-${shortId}.pdf`;
  }

  if (type === "IMAGE" || type === "STICKER") {
    return `image-${shortId}.jpg`;
  }

  if (type === "VIDEO") {
    return `video-${shortId}.mp4`;
  }

  if (type === "AUDIO") {
    return `audio-${shortId}.ogg`;
  }

  return `attachment-${shortId}`;
}

/** Format a chat excerpt as an internal team note. */
export function formatPinnedNoteText(content: string, at = new Date()): string {
  const time = at.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return `📌 Pinned from chat · ${time}\n${content}`;
}
