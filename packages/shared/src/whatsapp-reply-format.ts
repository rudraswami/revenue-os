/**
 * Deterministic post-compose cleanup for WhatsApp outbound text.
 * Prompt rules alone are unreliable — this normalizes before send/draft storage.
 */

export type WhatsAppReplyFormatIntent =
  | "greeting"
  | "thanks"
  | "test_checkin"
  | "pricing"
  | "negotiation"
  | "ready_to_buy"
  | "follow_up"
  | "complaint"
  | "availability_check"
  | "hours_location"
  | "booking_request"
  | "payment_method"
  | "product_info"
  | "general";

export interface FormatWhatsAppReplyOptions {
  intentKind?: string;
  /** Customer's latest message — used for reply-length matching. */
  inboundText?: string | null;
  /** Auto-send path — strip email-style closings more aggressively. */
  autoSend?: boolean;
}

/** Openers that read robotic on WhatsApp — stripped when they lead the message. */
const CORPORATE_OPENERS: RegExp[] = [
  /^thank you for (?:reaching out|your (?:message|inquiry|interest))[\s,!.—-]*/i,
  /^thanks for (?:reaching out|your (?:message|inquiry|interest))[\s,!.—-]*/i,
  /^i hope this (?:message|email) finds you well[\s,.!—-]*/i,
  /^i appreciate your (?:inquiry|message|interest)[\s,.!—-]*/i,
  /^we value your interest[\s,.!—-]*/i,
  /^dear (?:sir|madam|customer)[\s,!.—-]*/i,
  /^greetings[\s,!.—-]*/i,
];

/** Trailing email-style closings — removed on auto-send and when clearly appended. */
const FORMAL_CLOSINGS: RegExp[] = [
  /\n+(?:best|warm) regards[,!.]?\s*$/i,
  /\n+regards[,!.]?\s*$/i,
  /\n+best wishes[,!.]?\s*$/i,
  /\n+sincerely[,!.]?\s*$/i,
  /\n+thanks(?:\s+and\s+regards)?[,!.]?\s*$/i,
];

const MARKDOWN_BOLD = /\*\*([^*\n]+)\*\*/g;
const MARKDOWN_HEADER = /^#{1,6}\s+/gm;
const MARKDOWN_LIST_DASH = /^[\t ]*[-*]\s+/gm;

function inboundWordCount(text: string | null | undefined): number {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function maxLinesForInbound(inboundText: string | null | undefined, intentKind?: string): number {
  const words = inboundWordCount(inboundText);
  if (intentKind === "greeting" || intentKind === "thanks" || intentKind === "test_checkin") {
    return 4;
  }
  if (words <= 3) return 4;
  if (words <= 8) return 6;
  if (words <= 20) return 8;
  return 10;
}

function stripCorporateOpeners(text: string): string {
  let out = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of CORPORATE_OPENERS) {
      const next = out.replace(pattern, "").trim();
      if (next !== out) {
        out = next;
        changed = true;
      }
    }
  }
  return out;
}

function stripFormalClosings(text: string, autoSend: boolean): string {
  let out = text.trim();
  for (const pattern of FORMAL_CLOSINGS) {
    out = out.replace(pattern, "").trim();
  }
  if (autoSend) {
    // Team sign-offs read like email on short auto-replies.
    out = out.replace(/\n+—\s*Team\s+.+$/i, "").trim();
  }
  return out;
}

function normalizeWhatsAppBold(text: string): string {
  return text.replace(MARKDOWN_BOLD, "*$1*");
}

function normalizeMarkdownArtifacts(text: string): string {
  return text
    .replace(MARKDOWN_HEADER, "")
    .replace(MARKDOWN_LIST_DASH, "• ")
    .replace(/`([^`\n]+)`/g, "$1");
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function enforceMaxLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  const kept = lines.slice(0, maxLines).join("\n").trim();
  // Avoid cutting mid-thought with "..." on auto replies — prefer hard cap.
  return kept;
}

function ensurePricingStructure(text: string, intentKind?: string): string {
  if (intentKind !== "pricing" && intentKind !== "payment_method") return text;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return text;

  // If the model used numbered lists, convert to bullet lines for WhatsApp scanability.
  const normalized = lines.map((line) => {
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) return `• ${numbered[1]}`;
    if (/^[-*]\s+/.test(line)) return line.replace(/^[-*]\s+/, "• ");
    return line;
  });

  return normalized.join("\n");
}

/**
 * Normalize composed reply text for WhatsApp delivery or draft display.
 */
export function formatWhatsAppReply(
  text: string,
  opts: FormatWhatsAppReplyOptions = {},
): string {
  const raw = text.trim();
  if (!raw) return raw;

  let out = raw;
  out = normalizeMarkdownArtifacts(out);
  out = normalizeWhatsAppBold(out);
  out = stripCorporateOpeners(out);
  out = stripFormalClosings(out, Boolean(opts.autoSend));
  out = ensurePricingStructure(out, opts.intentKind);
  out = collapseBlankLines(out);

  const maxLines = maxLinesForInbound(opts.inboundText, opts.intentKind);
  out = enforceMaxLines(out, maxLines);

  return out.trim();
}
