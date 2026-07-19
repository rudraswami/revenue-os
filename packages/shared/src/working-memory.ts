import type { LeadStage } from "./types";

export const ENGAGEMENT_PHASES = ["first_contact", "returning", "active_deal"] as const;
export type EngagementPhase = (typeof ENGAGEMENT_PHASES)[number];

export interface CustomerCard {
  displayName: string | null;
  phone: string;
  stage: LeadStage;
  score: number;
  tags: string[];
  language: string | null;
  lastSummary: string | null;
  lastIntent: string | null;
  nextAction: string | null;
}

export interface WorkingMemory {
  engagementPhase: EngagementPhase;
  customerCard: CustomerCard;
  /** True when the business or AI has sent at least one outbound text. */
  threadAlreadyEngaged: boolean;
  outboundCount: number;
  inboundCount: number;
  lastQuotedAmount: string | null;
  openCommitments: string[];
  contradictionFlags: string[];
}

export interface BuildWorkingMemoryInput {
  lead: {
    stage: LeadStage;
    score: number;
    displayName: string | null;
    phone: string;
    profile: Record<string, unknown>;
  };
  conversation: {
    contactName: string | null;
  };
  messages: Array<{
    direction: string;
    content: string | null;
    sentByAi?: boolean;
  }>;
  observedMemory: Array<{
    content: string;
    source: string;
    type: string;
  }>;
}

const ACTIVE_DEAL_STAGES: LeadStage[] = ["QUALIFIED", "PROPOSAL", "NEGOTIATION"];
const QUOTE_AMOUNT_PATTERN =
  /(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)|([\d,]+)\s*(?:₹|\/-)/gi;
const CONTRADICTION_PATTERN =
  /\b(not what|that's wrong|that is wrong|no that's|galat|galt|nahi|wrong price|wrong quote)\b/i;

function stringFromProfile(profile: Record<string, unknown>, key: string): string | null {
  const v = profile[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function stringArrayFromProfile(profile: Record<string, unknown>, key: string): string[] {
  const v = profile[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).trim());
}

/** Prefer human-corrected memory facts over AI when keys overlap. */
function pickMemoryLine(
  memory: BuildWorkingMemoryInput["observedMemory"],
  prefix: string,
): string | null {
  const human = memory.find(
    (m) => m.source === "human" && m.content.toLowerCase().startsWith(prefix.toLowerCase()),
  );
  if (human) return human.content;
  const ai = memory.find((m) => m.content.toLowerCase().startsWith(prefix.toLowerCase()));
  return ai?.content ?? null;
}

export function resolveEngagementPhase(input: BuildWorkingMemoryInput): EngagementPhase {
  const outbound = input.messages.filter(
    (m) => m.direction === "OUTBOUND" && (m.content?.trim().length ?? 0) > 0,
  );
  if (outbound.length === 0) return "first_contact";
  if (
    ACTIVE_DEAL_STAGES.includes(input.lead.stage) ||
    input.lead.score >= 50
  ) {
    return "active_deal";
  }
  return "returning";
}

export function extractLastQuotedAmount(
  messages: BuildWorkingMemoryInput["messages"],
  memory: BuildWorkingMemoryInput["observedMemory"],
): string | null {
  const sources = [
    ...memory.map((m) => m.content),
    ...messages
      .filter((m) => m.direction === "OUTBOUND")
      .map((m) => m.content ?? ""),
  ];
  for (const text of sources.reverse()) {
    const matches = [...text.matchAll(QUOTE_AMOUNT_PATTERN)];
    if (matches.length > 0) {
      const m = matches[matches.length - 1];
      const amount = (m[1] ?? m[2] ?? "").replace(/,/g, "");
      if (amount) return `₹${amount}`;
    }
  }
  return null;
}

export function detectContradictionFlags(
  messages: BuildWorkingMemoryInput["messages"],
): string[] {
  const flags: string[] = [];
  const recent = messages.slice(-6);
  const lastInboundIdx = [...recent]
    .map((m, i) => ({ m, i }))
    .reverse()
    .find(({ m }) => m.direction === "INBOUND")?.i;
  if (lastInboundIdx == null) return flags;

  const priorOutbound = recent
    .slice(0, lastInboundIdx)
    .some((m) => m.direction === "OUTBOUND" && (m.content?.trim().length ?? 0) > 0);
  const inbound = recent[lastInboundIdx].content ?? "";
  if (priorOutbound && CONTRADICTION_PATTERN.test(inbound)) {
    flags.push("customer_disputed_last_reply");
  }
  return flags;
}

export function buildOpenCommitments(
  memory: BuildWorkingMemoryInput["observedMemory"],
  profile: Record<string, unknown>,
): string[] {
  const commitments: string[] = [];
  const nextFromMemory = pickMemoryLine(memory, "Next action:");
  const nextFromProfile = stringFromProfile(profile, "nextAction");
  if (nextFromMemory) commitments.push(nextFromMemory.replace(/^Next action:\s*/i, ""));
  else if (nextFromProfile) commitments.push(nextFromProfile);

  for (const m of memory) {
    if (m.content.toLowerCase().startsWith("intent (corrected):")) {
      commitments.push(m.content.replace(/^Intent \(corrected\):\s*/i, ""));
    }
  }
  return [...new Set(commitments.map((c) => c.trim()).filter(Boolean))].slice(0, 4);
}

export function buildCustomerCard(input: BuildWorkingMemoryInput): CustomerCard {
  const profile = input.lead.profile;
  const languageFromMemory = pickMemoryLine(input.observedMemory, "Language:");
  const language =
    languageFromMemory?.replace(/^Language:\s*/i, "") ??
    stringFromProfile(profile, "classificationLanguage");

  const summaryFromMemory = input.observedMemory.find((m) => m.type === "summary");
  const lastSummary =
    summaryFromMemory?.content ??
    stringFromProfile(profile, "summary");

  const intentCorrected = input.observedMemory.find(
    (m) =>
      m.source === "human" &&
      m.content.toLowerCase().startsWith("intent (corrected):"),
  );
  const intentLine = intentCorrected
    ? intentCorrected.content
    : pickMemoryLine(input.observedMemory, "Intent:");
  const lastIntent =
    intentLine?.replace(/^Intent(?: \(corrected\))?:\s*/i, "") ??
    stringFromProfile(profile, "lastIntent");

  const nextLine = pickMemoryLine(input.observedMemory, "Next action:");
  const nextAction =
    nextLine?.replace(/^Next action:\s*/i, "") ?? stringFromProfile(profile, "nextAction");

  const tags = stringArrayFromProfile(profile, "aiTags");

  return {
    displayName: input.conversation.contactName ?? input.lead.displayName,
    phone: input.lead.phone,
    stage: input.lead.stage,
    score: input.lead.score,
    tags,
    language,
    lastSummary,
    lastIntent,
    nextAction,
  };
}

export function buildWorkingMemory(input: BuildWorkingMemoryInput): WorkingMemory {
  const outboundCount = input.messages.filter((m) => m.direction === "OUTBOUND").length;
  const inboundCount = input.messages.filter((m) => m.direction === "INBOUND").length;
  const threadAlreadyEngaged = input.messages.some(
    (m) => m.direction === "OUTBOUND" && (m.content?.trim().length ?? 0) > 0,
  );

  return {
    engagementPhase: resolveEngagementPhase(input),
    customerCard: buildCustomerCard(input),
    threadAlreadyEngaged,
    outboundCount,
    inboundCount,
    lastQuotedAmount: extractLastQuotedAmount(input.messages, input.observedMemory),
    openCommitments: buildOpenCommitments(input.observedMemory, input.lead.profile),
    contradictionFlags: detectContradictionFlags(input.messages),
  };
}

/** Format customer card for compose / classify prompts. */
export function formatCustomerCardBlock(memory: WorkingMemory): string {
  const c = memory.customerCard;
  const lines = [
    `Engagement: ${memory.engagementPhase.replace(/_/g, " ")}`,
    c.displayName ? `Customer: ${c.displayName}` : null,
    `Stage: ${c.stage} · Score: ${c.score}`,
    c.language ? `Language: ${c.language}` : null,
    c.lastIntent ? `Intent: ${c.lastIntent}` : null,
    c.lastSummary ? `Summary: ${c.lastSummary}` : null,
    c.nextAction ? `Next action: ${c.nextAction}` : null,
    memory.lastQuotedAmount ? `Last quoted: ${memory.lastQuotedAmount}` : null,
    memory.openCommitments.length
      ? `Open commitments: ${memory.openCommitments.join("; ")}`
      : null,
    memory.contradictionFlags.length
      ? `Watch: ${memory.contradictionFlags.join(", ")}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}
