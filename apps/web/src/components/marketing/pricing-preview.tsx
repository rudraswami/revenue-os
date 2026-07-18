"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { OUTCOME_TIERS, POSITIONING } from "@/lib/gtm-copy";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import { cn } from "@/lib/utils";

const PREVIEW_PLAN_IDS = ["starter", "growth"] as const;

export function PricingPreview() {
  const plans = PREVIEW_PLAN_IDS.map(
    (id) => PRICING_PLANS.find((p) => p.id === id)!,
  );

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const perDay = plan.price ? Math.round(plan.price / 30) : null;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 elev-1",
                plan.popular ? "border-accent ring-2 ring-accent/20" : "border-border",
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm font-medium text-accent">{plan.tagline}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{plan.forWho}</p>
              <p className="mt-4 text-3xl font-bold tracking-tight">
                ₹{plan.price!.toLocaleString("en-IN")}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {perDay ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ ₹{perDay.toLocaleString("en-IN")}/day · {POSITIONING.trialNote}
                </p>
              ) : null}
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                <Link href="/register">{CTA.startTrial}</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-[#fafbff] px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Agency or multi-location?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {OUTCOME_TIERS.operator.name} from ₹
            {OUTCOME_TIERS.operator.priceInr.toLocaleString("en-IN")}/mo · Enterprise for 15+
            clients
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-10">
            <Link href="/agencies">
              Operator for agencies
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-10 font-semibold text-accent">
            <Link href="/pricing">
              Compare all plans
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
