const PAYMENT_HINT =
  /\b(upi|payment|paid|paytm|gpay|google pay|phonepe|transaction|receipt|txn|neft|imps|₹|rs\.?\s*\d)/i;

/** Heuristic: inbound image/document may be payment proof — human confirms. */
export function isPaymentAssistCandidate(type: string, content: string | null): boolean {
  if (type !== "IMAGE" && type !== "DOCUMENT") return false;
  if (content && PAYMENT_HINT.test(content)) return true;
  if (type === "IMAGE" && (!content || content.startsWith("[Image"))) return true;
  return false;
}
