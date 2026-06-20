"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: 999,
    features: ["1 WhatsApp number", "2 team members", "Shared inbox", "Basic pipeline"],
    popular: false,
    custom: false,
  },
  {
    name: "Growth",
    price: 2999,
    features: ["3 numbers", "5 team members", "AI scoring", "Pipeline analytics", "3,000 leads/mo"],
    popular: true,
    custom: false,
  },
  {
    name: "Pro",
    price: 5999,
    features: ["Unlimited numbers", "Automations", "Revenue analytics", "API access"],
    popular: false,
    custom: false,
  },
  {
    name: "Enterprise",
    price: null,
    features: ["Unlimited leads", "Dedicated manager", "SSO", "SLA"],
    popular: false,
    custom: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-[#f8f9ff] py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="display-lg">Transparent pricing</h2>
          <p className="body-lg mx-auto mt-3 max-w-md">14-day free trial. No credit card.</p>
        </motion.div>

        <div className="mt-16 grid gap-0 divide-y divide-border overflow-hidden rounded-2xl bg-white ring-1 ring-border md:grid-cols-4 md:divide-x md:divide-y-0">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn("flex flex-col p-8", plan.popular && "bg-accent/[0.03] ring-2 ring-inset ring-accent")}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              {plan.popular && (
                <span className="mb-3 text-[11px] font-bold uppercase tracking-wide text-accent">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-4 text-3xl font-bold">
                {plan.custom ? (
                  "Custom"
                ) : (
                  <>
                    ₹{plan.price!.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[13px] text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Button
                asChild
                className={cn("mt-8 w-full", plan.popular && "btn-primary border-0")}
                variant={plan.popular ? "default" : "outline"}
              >
                <Link href={plan.custom ? "/contact" : "/register"}>
                  {plan.custom ? "Contact sales" : "Start trial"}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
