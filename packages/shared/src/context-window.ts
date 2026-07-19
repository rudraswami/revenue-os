import type { LeadStage } from "./types";

const DEFAULT_LIMIT = 16;
const EXTENDED_LIMIT = 28;
const ACTIVE_LIMIT = 24;

const EXTENDED_STAGES: LeadStage[] = ["NEGOTIATION", "PROPOSAL", "WON", "LOST"];
const ACTIVE_STAGES: LeadStage[] = ["QUALIFIED"];

/** Adaptive transcript window — more context for active deals and post-sale threads. */
export function resolveContextMessageLimit(stage: LeadStage): number {
  if (EXTENDED_STAGES.includes(stage)) return EXTENDED_LIMIT;
  if (ACTIVE_STAGES.includes(stage)) return ACTIVE_LIMIT;
  return DEFAULT_LIMIT;
}
