/** Human-readable template name from Meta slug. */
export function displayTemplateName(name: string): string {
  return name.replace(/_/g, " ");
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  en_IN: "English (India)",
  hi: "Hindi",
};

export function displayTemplateLanguage(code: string): string {
  return LANGUAGE_LABELS[code] ?? code;
}

const MEANINGLESS_REJECTION = new Set(["none", "n/a", "na", "null", "undefined", ""]);

/** Only show rejection copy when Meta returned something actionable. */
export function formatTemplateRejectionReason(
  reason: string | undefined | null,
): string | null {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (!trimmed || MEANINGLESS_REJECTION.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** Count {{n}} placeholders in template body. */
export function countTemplateVariables(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  const nums = matches.map((m) => Number(m.replace(/\D/g, "")));
  return Math.max(0, ...nums);
}

/** Insert {{n}} at cursor or append to body. */
export function insertTemplateVariable(body: string, index: number): string {
  const token = `{{${index}}}`;
  return body.trim() ? `${body}${body.endsWith(" ") ? "" : " "}${token}` : token;
}
