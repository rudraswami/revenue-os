/** Customer message is only a short greeting (no pricing/question content). */
const SIMPLE_GREETING =
  /^(hi+|hello+|hey+|hii+|namaste|good\s*(morning|afternoon|evening))[\s!.,?]*$/i;

const SIMPLE_THANKS =
  /^(thanks?|thank\s*you|thx|dhanyavaad|shukriya)[\s!.?]*$/i;

const SIMPLE_ACK =
  /^(ok+ay?|k|kk|sure|got\s*it|great|nice|cool|awesome|perfect|wonderful|lovely|superb|excellent|amazing|fantastic|good|sounds\s*good|all\s*good|noted|👍|🙏)[\s!.?]*$/i;

/** Customer message includes a real question beyond greeting/thanks/ack. */
const SUBSTANTIVE_QUESTION =
  /\?|(?:^|\s)(what|how|when|where|why|who|which|can you|could you|do you|is there|are there|tell me|i need|i want|looking for|price|cost|delivery|available|kitna|kya|kaise|kab|kahan|milega|chahiye)(?:\s|$)/i;

export function hasSubstantiveQuestion(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return SUBSTANTIVE_QUESTION.test(text.trim());
}

/** True only when the message is pure courtesy — no embedded question or request. */
export function isCourtesyOnlyMessage(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  if (hasSubstantiveQuestion(text)) return false;
  return isSimpleGreeting(text) || isSimpleThanks(text) || isSimpleAck(text);
}

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
