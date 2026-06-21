export type PricingPlan = {
  id: string;
  name: string;
  price: number | null;
  features: string[];
  popular: boolean;
  custom: boolean;
  checkoutPlanId?: "starter" | "growth" | "pro";
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    features: ["1 WhatsApp number", "2 team members", "Shared inbox", "Basic pipeline"],
    popular: false,
    custom: false,
    checkoutPlanId: "starter",
  },
  {
    id: "growth",
    name: "Growth",
    price: 2999,
    features: ["3 numbers", "5 team members", "AI scoring", "Pipeline analytics", "3,000 leads/mo"],
    popular: true,
    custom: false,
    checkoutPlanId: "growth",
  },
  {
    id: "pro",
    name: "Pro",
    price: 5999,
    features: ["Unlimited numbers", "Automations", "Revenue analytics", "API access"],
    popular: false,
    custom: false,
    checkoutPlanId: "pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    features: ["Unlimited leads", "Dedicated manager", "Priority support", "SLA"],
    popular: false,
    custom: true,
  },
];
