"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const periods = [
  { label: "6 months", months: 6 },
  { label: "9 months", months: 9 },
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
];

const plans = [
  {
    name: "Starter",
    price: 15,
    custom: false,
    description: "For small teams — access essentials for a simple workflow",
    features: ["1 WhatsApp number", "2,500 leads", "Basic pipeline", "2 team members"],
    popular: false,
  },
  {
    name: "Growth",
    price: 25,
    custom: false,
    description: "For growing teams — automate chats with smarter AI tools",
    features: [
      "3 WhatsApp numbers",
      "5,000 leads",
      "AI reply suggestions",
      "Full pipeline + analytics",
      "10 team members",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: 45,
    custom: false,
    description: "For mature teams — scale with advanced AI automation",
    features: [
      "Unlimited WhatsApp numbers",
      "10,000 leads",
      "Priority AI features",
      "Custom automations",
      "Unlimited team members",
    ],
    popular: false,
  },
  {
    name: "Enterprise",
    price: null,
    custom: true,
    description: "Custom CRM with top-grade security, control and support",
    features: [
      "Unlimited everything",
      "Dedicated account manager",
      "Custom integrations",
      "SLA & priority support",
      "SSO & advanced security",
    ],
    popular: false,
  },
];

export function Pricing() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const months = periods[periodIdx].months;

  return (
    <section id="pricing" className="scroll-mt-20 surface-muted py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="display-lg text-foreground">
            Go from overwhelmed to slam-dunk success
          </h2>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-white p-1 shadow-sm">
            {periods.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPeriodIdx(i)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-medium transition-all",
                  periodIdx === i
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border bg-white",
                plan.popular ? "border-primary shadow-xl xl:scale-[1.02]" : "border-border shadow-sm",
              )}
            >
              {plan.popular && (
                <div className="bg-gradient-to-r from-primary via-[#7c5ce0] to-[#9b7bff] px-7 py-3 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                </div>
              )}

              <div className="flex flex-1 flex-col p-7">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>

                <div className="mt-6">
                  {plan.custom ? (
                    <>
                      <span className="text-3xl font-bold">Custom</span>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Depends on your setup
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-medium text-muted-foreground">$</span>
                        <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                      </div>
                      <p className="text-[13px] text-muted-foreground">USD per user/month</p>
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Billed ${(plan.price ?? 0) * months}/user for {periods[periodIdx].label}
                      </p>
                    </>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px]">
                      <span className="mt-0.5 text-primary">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn("mt-7 w-full", plan.popular && "btn-gradient border-0")}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.custom ? "/login" : "/register"}>
                    {plan.custom ? "Contact sales" : "Try it free"}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
