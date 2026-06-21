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
