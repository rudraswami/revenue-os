/** Customer message is only a short greeting (no pricing/question content). */
const SIMPLE_GREETING =
  /^(hi+|hello+|hey+|hii+|namaste|good\s*(morning|afternoon|evening))[\s!.,?]*$/i;

export function isSimpleGreeting(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const trimmed = text.trim();
  if (trimmed.length > 40) return false;
  return SIMPLE_GREETING.test(trimmed);
}
