import type { GrowvisiPlanId } from "@growvisi/shared";
import { GROWVISI_PLANS } from "@growvisi/shared";

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

/** Shape returned by GET /billing and shell bootstrap `billing`. */
export type CampaignsBillingSnapshot = {
  planId?: string;
  entitlements?: { hasAccess?: boolean };
};

/**
 * Campaigns + message templates require Team (growth) or Operator (pro).
 * Solo (starter) and trial do not include outbound template broadcasts.
 */
export function canUseCampaignsFeatures(billing?: CampaignsBillingSnapshot | null): boolean {
  if (!billing?.entitlements?.hasAccess) return false;
  const planId = (billing.planId ?? "trial") as GrowvisiPlanId;
  const rank = PLAN_RANK[planId in PLAN_RANK ? planId : "trial"];
  return rank >= PLAN_RANK.growth;
}

/** Suggested checkout tier when user hits the campaigns/templates gate. */
export function campaignsUpgradePlanId(currentPlanId?: string): "growth" | "pro" {
  const planId = (currentPlanId ?? "trial") as GrowvisiPlanId;
  const rank = PLAN_RANK[planId in PLAN_RANK ? planId : "trial"];
  return rank < PLAN_RANK.growth ? "growth" : "pro";
}

export function campaignsUpgradeLabel(planId: "growth" | "pro"): string {
  const plan = GROWVISI_PLANS[planId];
  return `Upgrade to ${plan.name} — ₹${plan.priceInr.toLocaleString("en-IN")}/mo`;
}
