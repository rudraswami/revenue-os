import type {
  AiClassificationResult,
  ClassificationEntities,
  ClassificationLanguage,
  DealTemperature,
  LeadStage,
} from "./types";

const CLASSIFICATION_LANGUAGES = ["en", "hi", "hinglish", "mixed"] as const;
const DEAL_TEMPERATURES = ["cold", "warm", "hot"] as const;

const MAX_NEED_LEN = 120;
const MAX_NEEDS = 6;
const MAX_BRIEF_LEN = 400;
const MAX_ENTITY_LEN = 80;

function trimString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t ? t.slice(0, max) : undefined;
}

function stringArray(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .map((v) => String(v).trim().slice(0, maxLen))
    .slice(0, maxItems);
}

function normalizeEntities(raw: unknown): ClassificationEntities | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Record<string, unknown>;
  const entities: ClassificationEntities = {};
  const location = trimString(input.location, MAX_ENTITY_LEN);
  const budget = trimString(input.budget, MAX_ENTITY_LEN);
  const product = trimString(input.product, MAX_ENTITY_LEN);
  const quantity = trimString(input.quantity, MAX_ENTITY_LEN);
  if (location) entities.location = location;
  if (budget) entities.budget = budget;
  if (product) entities.product = product;
  if (quantity) entities.quantity = quantity;
  return Object.keys(entities).length > 0 ? entities : undefined;
}

export interface NormalizeClassificationInput {
  stage: LeadStage;
  confidence: number;
  intent: string;
  sentiment: AiClassificationResult["sentiment"];
  suggestedActions: string[];
  requiresHuman: boolean;
  summary?: string;
  tags?: string[];
  nextAction?: string;
}

/** Merge v1 classify fields with optional Phase 2 judgment from raw LLM JSON. */
export function normalizeClassificationResult(
  base: NormalizeClassificationInput,
  raw: Record<string, unknown>,
): AiClassificationResult {
  const customerNeeds = stringArray(raw.customerNeeds, MAX_NEEDS, MAX_NEED_LEN);
  const unansweredFromCustomer = stringArray(
    raw.unansweredFromCustomer,
    MAX_NEEDS,
    MAX_NEED_LEN,
  );
  const buyingSignals = stringArray(raw.buyingSignals, 4, MAX_NEED_LEN);
  const replyBrief = trimString(raw.replyBrief, MAX_BRIEF_LEN);

  const langRaw = raw.language;
  const language: ClassificationLanguage | undefined = CLASSIFICATION_LANGUAGES.includes(
    langRaw as ClassificationLanguage,
  )
    ? (langRaw as ClassificationLanguage)
    : undefined;

  const tempRaw = raw.dealTemperature;
  const dealTemperature: DealTemperature | undefined = DEAL_TEMPERATURES.includes(
    tempRaw as DealTemperature,
  )
    ? (tempRaw as DealTemperature)
    : undefined;

  const entities = normalizeEntities(raw.entities);

  return {
    ...base,
    customerNeeds: customerNeeds.length > 0 ? customerNeeds : undefined,
    replyBrief,
    language,
    entities,
    dealTemperature,
    unansweredFromCustomer:
      unansweredFromCustomer.length > 0 ? unansweredFromCustomer : undefined,
    apologyRequired:
      typeof raw.apologyRequired === "boolean" ? raw.apologyRequired : undefined,
    recoveryMode: typeof raw.recoveryMode === "boolean" ? raw.recoveryMode : undefined,
    requiresOwner: typeof raw.requiresOwner === "boolean" ? raw.requiresOwner : undefined,
    buyingSignals: buyingSignals.length > 0 ? buyingSignals : undefined,
  };
}

/** Build a richer RAG query from judgment fields when present. */
export function buildJudgmentRagQuery(result: Pick<
  AiClassificationResult,
  "intent" | "summary" | "replyBrief" | "entities" | "customerNeeds"
>): string {
  const parts: string[] = [];
  if (result.replyBrief?.trim()) parts.push(result.replyBrief.trim());
  if (result.intent?.trim()) parts.push(result.intent.trim());
  if (result.summary?.trim()) parts.push(result.summary.trim());
  for (const need of result.customerNeeds ?? []) {
    if (need.trim()) parts.push(need.trim());
  }
  const e = result.entities;
  if (e) {
    for (const val of [e.product, e.budget, e.location, e.quantity]) {
      if (val?.trim()) parts.push(val.trim());
    }
  }
  return parts.join(" — ").slice(0, 500);
}

/** Whether classification judgment flags require a human (owner) in the loop. */
export function classificationNeedsHuman(result: AiClassificationResult): boolean {
  return Boolean(
    result.requiresHuman || result.requiresOwner || result.recoveryMode,
  );
}

/** Merge judgment flags into v1 requiresHuman for downstream policy. */
export function applyClassificationJudgmentGuards(
  result: AiClassificationResult,
): AiClassificationResult {
  const needsHuman = classificationNeedsHuman(result);
  if (!needsHuman || result.requiresHuman) return result;
  return { ...result, requiresHuman: true };
}
