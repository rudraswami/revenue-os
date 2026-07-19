import type {
  AutomationPolicyPreset,
  ReplyAutonomyMode,
} from "@growvisi/shared";

export type PreviewScenarioId = "new_lead" | "thanks" | "complaint" | "hot_lead";

export interface PreviewScenario {
  id: PreviewScenarioId;
  label: string;
  customerMessage: string;
}

export const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: "new_lead",
    label: "Price inquiry",
    customerMessage: "Hi, what's the price for 2BHK interior?",
  },
  {
    id: "thanks",
    label: "Thanks",
    customerMessage: "Great, thanks!",
  },
  {
    id: "complaint",
    label: "Complaint",
    customerMessage: "You promised delivery yesterday — still waiting.",
  },
  {
    id: "hot_lead",
    label: "Ready to buy",
    customerMessage: "Can I visit your showroom on Saturday?",
  },
];

export type PreviewActionVariant = "neutral" | "success" | "warning" | "accent";

export interface PreviewOutcome {
  action: { label: string; variant: PreviewActionVariant };
  pipeline?: string;
  reply?: {
    text: string;
    state: "sent" | "draft" | "none" | "team";
  };
  footnote?: string;
}

const DEFAULT_GREETING = "Hi! Thanks for reaching out — how can we help you today?";
const DEFAULT_THANKS = "You're welcome! Let us know if you need anything else.";

export function resolvePreviewOutcome(
  mode: ReplyAutonomyMode,
  preset: AutomationPolicyPreset,
  scenarioId: PreviewScenarioId,
  options?: { greetingSample?: string; thanksSample?: string },
): PreviewOutcome {
  const greeting = options?.greetingSample?.trim() || DEFAULT_GREETING;
  const thanks = options?.thanksSample?.trim() || DEFAULT_THANKS;

  if (mode === "intel_only") {
    const base = {
      reply: { text: "", state: "none" as const },
      footnote: "Your team sends every reply from Conversations.",
    };
    switch (scenarioId) {
      case "new_lead":
        return {
          ...base,
          action: { label: "Classified · Lead", variant: "accent" },
          pipeline: "New lead · Interested",
        };
      case "thanks":
        return {
          ...base,
          action: { label: "Classified · Courtesy", variant: "neutral" },
        };
      case "complaint":
        return {
          ...base,
          action: { label: "Handed to you · Urgent", variant: "warning" },
          pipeline: "Needs attention",
          footnote: "Complaints always need a human — Growvisi won't reply.",
        };
      case "hot_lead":
        return {
          ...base,
          action: { label: "Hot lead alert · Email sent", variant: "accent" },
          pipeline: "Qualified · High intent",
        };
    }
  }

  if (mode === "assist") {
    switch (scenarioId) {
      case "new_lead":
        return {
          action: { label: "Draft ready in Inbox", variant: "accent" },
          pipeline: "New lead · Interested",
          reply: {
            text: "Thanks for asking! Our 2BHK packages start from ₹4.5L — I'll share details shortly.",
            state: "draft",
          },
          footnote: "You review and tap Send — nothing goes out automatically.",
        };
      case "thanks":
        return {
          action: { label: "Draft ready", variant: "neutral" },
          reply: { text: thanks, state: "draft" },
        };
      case "complaint":
        return {
          action: { label: "Needs you · No draft", variant: "warning" },
          pipeline: "Escalated",
          reply: {
            text: "Sorry about the delay — a teammate will call you shortly.",
            state: "draft",
          },
          footnote: "Sensitive topics never auto-send. You choose the final message.",
        };
      case "hot_lead":
        return {
          action: { label: "Hot lead alert + draft", variant: "accent" },
          pipeline: "Qualified · Site visit",
          reply: {
            text: "Saturday works! What time suits you — morning or afternoon?",
            state: "draft",
          },
        };
    }
  }

  // auto_guarded
  const careful = preset === "careful";
  const responsive = preset === "responsive";

  switch (scenarioId) {
    case "thanks":
      return {
        action: { label: "Auto-replied on WhatsApp", variant: "success" },
        reply: { text: thanks, state: "sent" },
        footnote: careful
          ? "Only greetings & short thanks get an auto-reply."
          : "Matched courtesy messages auto-reply instantly.",
      };
    case "new_lead":
      if (responsive) {
        return {
          action: { label: "Auto-replied · Grounded FAQ", variant: "success" },
          pipeline: "New lead · Interested",
          reply: {
            text: "Our 2BHK interior packages start from ₹4.5L. Happy to share a detailed quote!",
            state: "sent",
          },
          footnote: "Pricing only sends when it matches your Business Knowledge.",
        };
      }
      return {
        action: { label: "Waiting for you", variant: "warning" },
        pipeline: "New lead · Interested",
        reply: {
          text: greeting,
          state: careful ? "none" : "draft",
        },
        footnote: "Pricing & deals always need your review unless docs fully match.",
      };
    case "complaint":
      return {
        action: { label: "Handed to you · Urgent", variant: "warning" },
        pipeline: "Escalated",
        reply: { text: "", state: "none" },
        footnote: "Complaints never auto-reply. You take over with one tap.",
      };
    case "hot_lead":
      return {
        action: { label: "Auto-replied + hot lead alert", variant: "accent" },
        pipeline: "Qualified · Site visit",
        reply: {
          text: "Saturday works! What time suits you — morning or afternoon?",
          state: preset === "careful" ? "draft" : "sent",
        },
      };
  }
}

export const AUTONOMY_OPTIONS: Array<{
  mode: ReplyAutonomyMode;
  title: string;
  subtitle: string;
  recommended?: boolean;
}> = [
  {
    mode: "intel_only",
    title: "I'll reply myself",
    subtitle: "Growvisi tracks & organizes. You send every message.",
  },
  {
    mode: "assist",
    title: "Draft for me",
    subtitle: "Growvisi writes drafts. You review and send.",
    recommended: true,
  },
  {
    mode: "auto_guarded",
    title: "WhatsApp auto-reply",
    subtitle:
      "Growvisi replies instantly to greetings, thanks & grounded FAQs. You own pricing, complaints & deals.",
  },
];

export const PRESET_OPTIONS: Array<{
  preset: AutomationPolicyPreset;
  title: string;
  hint: string;
}> = [
  {
    preset: "careful",
    title: "Hello & thanks",
    hint: "Auto-reply to greetings and short acknowledgments only.",
  },
  {
    preset: "balanced",
    title: "FAQs from your docs",
    hint: "Matched Business Knowledge can auto-reply. Pricing needs you.",
  },
  {
    preset: "responsive",
    title: "Broader auto-replies",
    hint: "More grounded auto-replies. Negotiation and deals stay with you.",
  },
];

export function autonomyLabel(mode: ReplyAutonomyMode): string {
  return AUTONOMY_OPTIONS.find((o) => o.mode === mode)?.title ?? "Draft for me";
}
