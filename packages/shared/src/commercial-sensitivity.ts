import type { LeadStage } from "./types";
import type { RelationshipPhase } from "./working-memory";

export type CommercialSensitivity = "low" | "medium" | "high";

const COMMERCIAL_INTENT_KINDS = new Set([
  "pricing",
  "negotiation",
  "ready_to_buy",
]);

const PRICING_INBOUND_PATTERN =
  /pric|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much/i;

export interface AssessCommercialSensitivityInput {
  relationshipPhase: RelationshipPhase;
  stage: LeadStage;
  intentKind: string;
  lastInbound?: string | null;
  dealTemperature?: string | null;
}

export function isCommercialIntentKind(intentKind: string): boolean {
  return COMMERCIAL_INTENT_KINDS.has(intentKind);
}

export function isCommercialInbound(text: string | null | undefined): boolean {
  return PRICING_INBOUND_PATTERN.test((text ?? "").trim());
}

/**
 * How risky it is to auto-send a commercial reply.
 * Stage influences caution; courtesy and support stay low.
 */
export function assessCommercialSensitivity(
  input: AssessCommercialSensitivityInput,
): CommercialSensitivity {
  const commercialMessage =
    isCommercialIntentKind(input.intentKind) || isCommercialInbound(input.lastInbound);

  if (input.relationshipPhase === "post_sale") {
    return commercialMessage ? "high" : "low";
  }

  if (input.relationshipPhase === "win_back") {
    return commercialMessage ? "medium" : "low";
  }

  if (commercialMessage) {
    if (input.stage === "NEGOTIATION" || input.stage === "PROPOSAL") return "high";
    if (input.dealTemperature === "hot") return "medium";
    return "medium";
  }

  return "low";
}

/** Whether deal-stage preset rules should force draft instead of auto-send. */
export function shouldApplyDealStageGate(opts: {
  stage: LeadStage;
  humanForStages: string[];
  commercialSensitivity: CommercialSensitivity;
  intentKind: string;
  isCourtesy: boolean;
}): boolean {
  if (opts.isCourtesy) return false;
  if (!opts.humanForStages.includes(opts.stage)) return false;
  if (opts.commercialSensitivity === "low") return false;
  return true;
}
