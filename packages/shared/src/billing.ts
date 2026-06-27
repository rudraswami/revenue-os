/** Growvisi paid plans — INR monthly via Razorpay */
export const GROWVISI_PLANS = {
  trial: {
    id: "trial",
    name: "Trial",
    priceInr: 0,
    description: "14-day free trial",
    razorpayPlanEnvKey: null,
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceInr: 999,
    description: "1 WhatsApp number, 2 team members",
    razorpayPlanEnvKey: "RAZORPAY_PLAN_STARTER",
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceInr: 2999,
    description: "3 numbers, 5 team members, AI scoring",
    razorpayPlanEnvKey: "RAZORPAY_PLAN_GROWTH",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceInr: 5999,
    description: "Unlimited numbers, automations, API",
    razorpayPlanEnvKey: "RAZORPAY_PLAN_PRO",
  },
} as const;

export type GrowvisiPlanId = keyof typeof GROWVISI_PLANS;

export const PAID_PLAN_IDS = ["starter", "growth", "pro"] as const satisfies readonly GrowvisiPlanId[];

export const TRIAL_DAYS = 14;

export interface PlanLimits {
  whatsappNumbers: number;
  teamMembers: number;
  monthlyLeads: number;
  agencyClients: number;
}

export const PLAN_LIMITS: Record<GrowvisiPlanId, PlanLimits> = {
  trial: { whatsappNumbers: 1, teamMembers: 2, monthlyLeads: 500, agencyClients: 0 },
  starter: { whatsappNumbers: 1, teamMembers: 2, monthlyLeads: 3_000, agencyClients: 0 },
  growth: { whatsappNumbers: 3, teamMembers: 5, monthlyLeads: 3_000, agencyClients: 0 },
  pro: { whatsappNumbers: 50, teamMembers: 50, monthlyLeads: 100_000, agencyClients: 15 },
};

export interface SubscriptionAccessInput {
  planId: string;
  status: string;
  createdAt: Date;
  currentPeriodEnd?: Date | null;
}

export interface SubscriptionAccess {
  planId: GrowvisiPlanId;
  limits: PlanLimits;
  trialEndsAt: string | null;
  trialExpired: boolean;
  hasAccess: boolean;
  requiresUpgrade: boolean;
  status: string;
}

export function resolveSubscriptionAccess(input: SubscriptionAccessInput): SubscriptionAccess {
  const planId = (
    input.planId in GROWVISI_PLANS ? input.planId : "trial"
  ) as GrowvisiPlanId;
  const trialEndsAt = new Date(input.createdAt);
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + TRIAL_DAYS);

  const isPaidActive = input.status === "ACTIVE";
  const onTrial = input.status === "TRIALING" && planId === "trial";
  const trialExpired = onTrial && Date.now() > trialEndsAt.getTime();
  const requiresUpgrade =
    trialExpired || input.status === "PAST_DUE" || input.status === "CANCELED";

  return {
    planId,
    limits: PLAN_LIMITS[planId],
    trialEndsAt: onTrial ? trialEndsAt.toISOString() : null,
    trialExpired,
    hasAccess: isPaidActive || (onTrial && !trialExpired),
    requiresUpgrade,
    status: input.status,
  };
}
