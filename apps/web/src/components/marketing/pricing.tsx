"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { SectionHeader } from "./section-header";

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
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-background py-20 md:py-28">
      <div className="marketing-container max-w-[1100px]">
        <SectionHeader
          label="Pricing"
          title="Transparent INR pricing"
          subtitle="14-day free trial on every plan. No credit card to start."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-white p-6 shadow-[0_8px_32px_rgb(11_28_48/0.05)] transition-shadow",
                plan.popular
                  ? "border-accent ring-2 ring-accent/20"
                  : "border-border",
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4, boxShadow: "0 16px 48px rgb(11 28 48 / 0.1)" }}
            >
              {plan.popular && (
                <motion.span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Most popular
                </motion.span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {plan.custom ? (
                  "Custom"
                ) : (
                  <>
                    ₹{plan.price!.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </>
                )}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 w-full rounded-xl"
                variant={plan.popular ? "accent" : "outline"}
              >
                <Link href={plan.custom ? "/contact" : "/register"}>
                  {plan.custom ? "Contact sales" : CTA.startTrial}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
