"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

const plans = [
  {
    name: "Starter",
    price: 999,
    description: "For solo founders and small businesses.",
    features: ["1 WhatsApp number", "2 team members", "Shared inbox", "Basic pipeline", "500 leads/mo"],
    popular: false,
    custom: false,
  },
  {
    name: "Growth",
    price: 2999,
    description: "For growing teams that need AI scoring & analytics.",
    features: [
      "3 WhatsApp numbers",
      "5 team members",
      "AI classification",
      "Lead scoring",
      "Pipeline analytics",
      "3,000 leads/mo",
    ],
    popular: true,
    custom: false,
  },
  {
    name: "Pro",
    price: 5999,
    description: "For teams that want automation and scale.",
    features: [
      "Unlimited numbers",
      "Unlimited team",
      "Workflow automations",
      "Revenue analytics",
      "API access",
      "10,000 leads/mo",
    ],
    popular: false,
    custom: false,
  },
  {
    name: "Enterprise",
    price: null,
    description: "Custom integrations and governance.",
    features: ["Unlimited leads", "Dedicated success manager", "SSO", "SLA support", "Custom reporting"],
    popular: false,
    custom: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-[#f8f9ff] py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <h2 className="display-lg text-foreground">Transparent Pricing</h2>
          <p className="body-lg mx-auto mt-3 max-w-[480px]">Start free for 14 days. No credit card required.</p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.05}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl bg-white p-6 elev-1",
                  plan.popular && "ring-2 ring-accent",
                )}
              >
                {plan.popular && (
                  <span className="mb-4 inline-block w-fit rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{plan.description}</p>

                <div className="mt-6">
                  {plan.custom ? (
                    <p className="text-3xl font-bold">Custom</p>
                  ) : (
                    <p className="text-3xl font-bold">
                      ₹{plan.price!.toLocaleString("en-IN")}
                      <span className="text-[14px] font-normal text-muted-foreground">/mo</span>
                    </p>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <span className="text-accent">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={cn("mt-6 w-full", plan.popular && "btn-primary border-0 hover:bg-[#005236]")}
                  variant={plan.popular ? "default" : "outline"}
                >
                  <Link href={plan.custom ? "/contact" : "/register"}>
                    {plan.custom ? "Contact Sales" : "Start Free Trial"}
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
