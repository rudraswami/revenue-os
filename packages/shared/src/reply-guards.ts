/** Customer message is only a short greeting (no pricing/question content). */
const SIMPLE_GREETING =
  /^(hi+|hello+|hey+|hii+|namaste|good\s*(morning|afternoon|evening))[\s!.,?]*$/i;

const SIMPLE_THANKS =
  /^(thanks?|thank\s*you|thx|dhanyavaad|shukriya)[\s!.?]*$/i;

const SIMPLE_ACK = /^(ok+ay?|k|kk|sure|got\s*it|👍|🙏)[\s!.?]*$/i;

export function isSimpleGreeting(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const trimmed = text.trim();
  if (trimmed.length > 40) return false;
  return SIMPLE_GREETING.test(trimmed);
}

export function isSimpleThanks(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const trimmed = text.trim();
  if (trimmed.length > 40) return false;
  return SIMPLE_THANKS.test(trimmed);
}

/** Short acknowledgement — thanks, okay, thumbs up. */
export function isSimpleAck(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const trimmed = text.trim();
  if (trimmed.length > 20) return false;
  return isSimpleThanks(trimmed) || SIMPLE_ACK.test(trimmed);
}
