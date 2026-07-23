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
    name: "Solo",
    priceInr: 999,
    description: "1 WhatsApp number, 2 team members",
    razorpayPlanEnvKey: "RAZORPAY_PLAN_STARTER",
  },
  growth: {
    id: "growth",
    name: "Team",
    priceInr: 2999,
    description: "3 numbers, 5 team members, campaigns & attribution",
    razorpayPlanEnvKey: "RAZORPAY_PLAN_GROWTH",
  },
  pro: {
    id: "pro",
    name: "Operator",
    priceInr: 5999,
    description: "Up to 50 numbers, agency hub, API",
    razorpayPlanEnvKey: "RAZORPAY_PLAN_PRO",
  },
} as const;

export type GrowvisiPlanId = keyof typeof GROWVISI_PLANS;

export const PAID_PLAN_IDS = ["starter", "growth", "pro"] as const satisfies readonly GrowvisiPlanId[];

export const TRIAL_DAYS = 14;

/** Grace window when renewal webhook is delayed but Razorpay still shows ACTIVE. */
export const PAID_RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export interface PlanLimits {
  whatsappNumbers: number;
  teamMembers: number;
  monthlyLeads: number;
  agencyClients: number;
  /** Max recipients per single campaign send (Growth+). */
  maxCampaignRecipientsPerSend: number;
  /** Max campaign messages sent per calendar month (UTC). */
  monthlyCampaignRecipients: number;
}

export const PLAN_LIMITS: Record<GrowvisiPlanId, PlanLimits> = {
  trial: {
    whatsappNumbers: 1,
    teamMembers: 2,
    monthlyLeads: 500,
    agencyClients: 0,
    maxCampaignRecipientsPerSend: 0,
    monthlyCampaignRecipients: 0,
  },
  starter: {
    whatsappNumbers: 1,
    teamMembers: 2,
    monthlyLeads: 3_000,
    agencyClients: 0,
    maxCampaignRecipientsPerSend: 0,
    monthlyCampaignRecipients: 0,
  },
  growth: {
    whatsappNumbers: 3,
    teamMembers: 5,
    monthlyLeads: 3_000,
    agencyClients: 0,
    maxCampaignRecipientsPerSend: 2_000,
    monthlyCampaignRecipients: 10_000,
  },
  pro: {
    whatsappNumbers: 50,
    teamMembers: 50,
    monthlyLeads: 100_000,
    agencyClients: 15,
    maxCampaignRecipientsPerSend: 5_000,
    monthlyCampaignRecipients: 100_000,
  },
};

export interface SubscriptionAccessInput {
  planId: string;
  status: string;
  createdAt: Date;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
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

  const now = Date.now();
  const isPaidActive = input.status === "ACTIVE";
  const onTrial = input.status === "TRIALING" && planId === "trial";
  const trialExpired = onTrial && now > trialEndsAt.getTime();
  const paidPlan = planId !== "trial";
  const periodEndMs = input.currentPeriodEnd?.getTime() ?? null;
  const withinPaidPeriod = paidPlan && periodEndMs != null && now < periodEndMs;

  const paidPeriodLapsed =
    paidPlan &&
    periodEndMs != null &&
    now > periodEndMs + PAID_RENEWAL_GRACE_MS;

  const paidActiveAccess = isPaidActive && paidPlan && !paidPeriodLapsed;

  // Webhook may mark CANCELED before current_period_end — honor paid-through date.
  const canceledEarlyWithPaidTime = input.status === "CANCELED" && withinPaidPeriod;

  const hasAccess =
    paidActiveAccess ||
    (isPaidActive && !paidPlan) ||
    (onTrial && !trialExpired) ||
    canceledEarlyWithPaidTime;

  const requiresUpgrade =
    trialExpired ||
    input.status === "PAST_DUE" ||
    (input.status === "CANCELED" && !withinPaidPeriod);

  return {
    planId,
    limits: PLAN_LIMITS[planId],
    trialEndsAt: onTrial ? trialEndsAt.toISOString() : null,
    trialExpired,
    hasAccess,
    requiresUpgrade,
    status: input.status,
  };
}
