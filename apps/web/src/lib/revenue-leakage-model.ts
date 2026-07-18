import { OUTCOME_TIERS } from "./gtm-copy";

export type TeamBand = "solo" | "team" | "operator";

export type RecoveryScenario = "conservative" | "likely" | "optimistic";

export type LeakageInputs = {
  leadsPerMonth: number;
  needHumanPct: number;
  goColdPct: number;
  avgDealInr: number;
  teamBand: TeamBand;
  scenario: RecoveryScenario;
};

const RECOVERY_RATES: Record<RecoveryScenario, number> = {
  conservative: 0.2,
  likely: 0.3,
  optimistic: 0.4,
};

/** Share of at-risk leads that would convert with timely human follow-up. */
const CONVERSION_ON_FOLLOWUP = 0.12;

export function suggestPlan(
  leadsPerMonth: number,
  teamBand: TeamBand,
): keyof typeof OUTCOME_TIERS {
  if (teamBand === "operator" || leadsPerMonth > 3_000) return "operator";
  if (teamBand === "team" || leadsPerMonth > 800) return "team";
  return "solo";
}

export function planCostInr(tier: keyof typeof OUTCOME_TIERS): number {
  return OUTCOME_TIERS[tier].priceInr;
}

export function computeLeakage(inputs: LeakageInputs) {
  const leads = Math.max(0, inputs.leadsPerMonth);
  const needHuman = Math.min(100, Math.max(0, inputs.needHumanPct)) / 100;
  const goCold = Math.min(100, Math.max(0, inputs.goColdPct)) / 100;
  const deal = Math.max(0, inputs.avgDealInr);

  const atRiskLeads = leads * needHuman * goCold;
  const lostDeals = atRiskLeads * CONVERSION_ON_FOLLOWUP;
  const lostRevenue = lostDeals * deal;

  const recoveryRate = RECOVERY_RATES[inputs.scenario];
  const recoverable = lostRevenue * recoveryRate;

  const suggestedTier = suggestPlan(leads, inputs.teamBand);
  const plan = OUTCOME_TIERS[suggestedTier];
  const cost = plan.priceInr;
  const roi = cost > 0 ? recoverable / cost : 0;
  const paybackDays =
    recoverable > 0 ? Math.ceil((cost / recoverable) * 30) : null;
  const perDay = Math.round(cost / 30);

  return {
    atRiskLeads: Math.round(atRiskLeads),
    lostRevenue,
    recoverable,
    recoveryRate,
    suggestedTier,
    planName: plan.name,
    planCost: cost,
    planPerDay: perDay,
    roi,
    paybackDays,
  };
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
