import type { LeadStage } from "@growvisi/shared";

export const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export function formatStage(stage: string): string {
  return STAGE_LABELS[stage as LeadStage] ?? stage.replace(/_/g, " ");
}
