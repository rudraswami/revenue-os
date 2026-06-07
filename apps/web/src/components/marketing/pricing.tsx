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
    description: "For small teams — access essentials for a simple workflow",
    features: ["1 WhatsApp number", "2,500 leads", "Basic pipeline", "2 team members"],
    popular: false,
  },
  {
    name: "Growth",
    price: 25,
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
];

export function Pricing() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const months = periods[periodIdx].months;

  return (
    <section id="pricing" className="surface-muted py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[560px] text-center">
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

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-7",
                plan.popular ? "border-primary shadow-lg" : "border-border",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {plan.description}
              </p>

              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-[13px] font-medium text-muted-foreground">$</span>
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-[13px] text-muted-foreground">USD per user/month</span>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Billed ${plan.price * months}/user for {periods[periodIdx].label}
                </p>
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
                className="mt-7 w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link href="/register">Try it free</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
