/** Meta WhatsApp message template categories. */
export type MessageTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type MessageTemplateStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL"
  | "PENDING_DELETION";

export type MessageTemplateLanguage = "en" | "en_IN" | "hi";

export type MessageTemplateStarter = {
  id: string;
  title: string;
  description: string;
  category: MessageTemplateCategory;
  language: MessageTemplateLanguage;
  body: string;
  /** Suggested variable labels for {{1}}, {{2}}, … */
  variableHints: string[];
  /** Typical Meta approval speed hint for UX copy */
  approvalHint: "fast" | "standard";
};

export type MessageTemplateView = {
  name: string;
  language: string;
  status: MessageTemplateStatus | string;
  category?: string;
  bodyPreview: string;
  bodyText: string;
  bodyVariableCount: number;
  metaTemplateId?: string;
  rejectedReason?: string;
};

/** Default starter auto-submitted on first WhatsApp connect (Growth+, empty WABA). */
export const AUTO_PROVISION_STARTER_ID = "followup_inquiry";

/** Hindi default when workspace owner locale is hi. */
export const AUTO_PROVISION_STARTER_ID_HI = "followup_hi";

export function resolveAutoProvisionStarterId(locale?: string | null): string {
  if (locale === "hi") return AUTO_PROVISION_STARTER_ID_HI;
  return AUTO_PROVISION_STARTER_ID;
}

/** Growvisi-curated starters — submitted to the customer's WABA, not shared globally. */
export const MESSAGE_TEMPLATE_STARTERS: MessageTemplateStarter[] = [
  {
    id: "followup_inquiry",
    title: "Follow-up after inquiry",
    description: "Re-engage leads who messaged but haven't replied.",
    category: "UTILITY",
    language: "en",
    body: "Hi {{1}}, thanks for reaching out to {{2}}. Our team is ready to help — reply here with any questions.",
    variableHints: ["Customer name", "Business name"],
    approvalHint: "fast",
  },
  {
    id: "offer_promo",
    title: "Limited-time offer",
    description: "Share a discount or festival offer with your segment.",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}! {{2}} has a special offer for you: {{3}}. Reply YES to know more.",
    variableHints: ["Customer name", "Business name", "Offer details"],
    approvalHint: "standard",
  },
  {
    id: "appointment_reminder",
    title: "Appointment reminder",
    description: "Clinics, real estate visits, or service bookings.",
    category: "UTILITY",
    language: "en",
    body: "Hi {{1}}, this is a reminder for your appointment with {{2}} on {{3}}. Reply to confirm or reschedule.",
    variableHints: ["Customer name", "Business name", "Date/time"],
    approvalHint: "fast",
  },
  {
    id: "payment_reminder",
    title: "Payment / order update",
    description: "D2C order status or payment follow-up.",
    category: "UTILITY",
    language: "en",
    body: "Hi {{1}}, your order with {{2}} is pending payment of ₹{{3}}. Reply if you need help completing it.",
    variableHints: ["Customer name", "Business name", "Amount"],
    approvalHint: "fast",
  },
  {
    id: "reengagement",
    title: "Win-back message",
    description: "Bring back cold leads in your pipeline.",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}, we haven't heard from you in a while. {{2}} still has options for you — reply when you're ready.",
    variableHints: ["Customer name", "Business name"],
    approvalHint: "standard",
  },
  {
    id: "followup_hi",
    title: "फॉलो-अप (Hindi)",
    description: "Hindi follow-up for India-first teams.",
    category: "UTILITY",
    language: "hi",
    body: "नमस्ते {{1}}, {{2}} की ओर से — आपकी पूछताछ के लिए धन्यवाद। कोई सवाल हो तो यहाँ रिप्लाई करें।",
    variableHints: ["ग्राहक का नाम", "व्यवसाय का नाम"],
    approvalHint: "fast",
  },
];

const TEMPLATE_NAME_RE = /^[a-z][a-z0-9_]{0,511}$/;

/** Meta template names: lowercase letters, numbers, underscores only. */
export function sanitizeTemplateName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 512);
}

export function validateTemplateName(name: string): { ok: true } | { ok: false; error: string } {
  const sanitized = sanitizeTemplateName(name);
  if (!sanitized) {
    return { ok: false, error: "Template name is required." };
  }
  if (!TEMPLATE_NAME_RE.test(sanitized)) {
    return {
      ok: false,
      error: "Use lowercase letters, numbers, and underscores only (e.g. followup_offer_v1).",
    };
  }
  return { ok: true };
}

export function countTemplateVariables(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  const nums = matches.map((m) => Number(m.replace(/\D/g, "")));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

export function validateTemplateBody(body: string): { ok: true; variableCount: number } | { ok: false; error: string } {
  const trimmed = body.trim();
  if (trimmed.length < 10) {
    return { ok: false, error: "Message body must be at least 10 characters." };
  }
  if (trimmed.length > 1024) {
    return { ok: false, error: "Message body must be 1024 characters or fewer." };
  }
  const variableCount = countTemplateVariables(trimmed);
  if (variableCount > 10) {
    return { ok: false, error: "Meta allows at most 10 variables per template body." };
  }
  // Variables must be sequential {{1}}..{{n}}
  for (let i = 1; i <= variableCount; i++) {
    if (!trimmed.includes(`{{${i}}}`)) {
      return {
        ok: false,
        error: `Variables must be sequential. Missing {{${i}}} in the body.`,
      };
    }
  }
  return { ok: true, variableCount };
}

/** Sample values Meta requires when a body contains {{1}}, {{2}}, … placeholders. */
const DEFAULT_VARIABLE_EXAMPLES = [
  "Rahul",
  "Acme Clinic",
  "Monday, 10 AM",
  "₹1,999",
  "Special offer",
  "Order #1234",
  "Team",
  "Mumbai",
  "Your business",
  "Details",
] as const;

/**
 * Meta rejects templates with variables unless each placeholder has an example value.
 * Returns `undefined` when the body has no variables.
 */
export function buildTemplateBodyExample(
  body: string,
  hints?: string[],
): { body_text: string[][] } | undefined {
  const count = countTemplateVariables(body);
  if (count === 0) return undefined;

  const row = Array.from({ length: count }, (_, i) => {
    const hint = hints?.[i]?.trim();
    if (hint) return hint.slice(0, 60);
    return DEFAULT_VARIABLE_EXAMPLES[i] ?? `Sample ${i + 1}`;
  });

  return { body_text: [row] };
}

/** Turn Meta rejection codes into plain language for SMB owners. */
export function humanizeTemplateRejectionReason(reason: string): string {
  const key = reason.trim().toUpperCase();
  const labels: Record<string, string> = {
    INVALID_FORMAT:
      "WhatsApp couldn't read the message format. Keep variables like {{1}}, {{2}} in order, with real text before and after each one.",
    INCORRECT_CATEGORY:
      "Wrong message type for this content. Try Updates & reminders for follow-ups and reminders.",
    TAG_CONTENT_MISMATCH: "Message type or language doesn't match the content.",
    ABUSIVE_CONTENT: "Content may violate WhatsApp policies. Remove promotional or sensitive wording.",
    SCAM: "Content flagged as misleading. Use clear, honest wording about who you are.",
    PROMOTIONAL: "Looks too promotional for this message type. Switch to Offers & promotions or soften the copy.",
  };
  return labels[key] ?? reason;
}

export function starterById(id: string): MessageTemplateStarter | undefined {
  return MESSAGE_TEMPLATE_STARTERS.find((s) => s.id === id);
}

export function defaultTemplateNameFromStarter(starterId: string): string {
  const base = sanitizeTemplateName(starterId.replace(/-/g, "_"));
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}_${suffix}`;
}

/** Meta allows editing body on APPROVED, REJECTED, and PAUSED templates. */
export function canEditTemplateBody(status: string): boolean {
  const key = status.toUpperCase();
  return key === "APPROVED" || key === "REJECTED" || key === "PAUSED";
}

/** Category can only change on rejected or paused templates — not approved. */
export function canEditTemplateCategory(status: string): boolean {
  const key = status.toUpperCase();
  return key === "REJECTED" || key === "PAUSED";
}

export function canDeleteTemplate(status: string): boolean {
  const key = status.toUpperCase();
  return key !== "PENDING_DELETION";
}

export function templateEditActionLabel(status: string): string {
  const key = status.toUpperCase();
  if (key === "REJECTED") return "Edit & resubmit";
  if (key === "APPROVED") return "Edit body";
  return "Edit template";
}

export function templateEditHint(status: string): string | null {
  const key = status.toUpperCase();
  if (key === "REJECTED") {
    return "Fix the issue Meta flagged, then resubmit for review. Name and language stay the same.";
  }
  if (key === "APPROVED") {
    return "Body edits go back to Meta for review. Category cannot change on approved templates.";
  }
  if (key === "PAUSED") {
    return "Paused templates can be edited and resubmitted. Check Meta’s pause reason first.";
  }
  if (key === "PENDING" || key === "IN_APPEAL") {
    return "Templates under review cannot be edited. Delete and create a new one if needed.";
  }
  return null;
}
