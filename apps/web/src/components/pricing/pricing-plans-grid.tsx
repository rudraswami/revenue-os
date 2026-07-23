"use client";

import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import { cn } from "@/lib/utils";

type PricingPlansGridProps = {
  variant: "marketing" | "app";
  currentPlanId?: string;
  subscriptionStatus?: string;
  /** Suggested plan from capacity friction deep-link. */
  highlightPlanId?: string;
  razorpayConfigured?: boolean;
  checkoutPlanId?: string | null;
  onUpgrade?: (planId: "starter" | "growth" | "pro") => void;
};

export function PricingPlansGrid({
  variant,
  currentPlanId,
  subscriptionStatus,
  highlightPlanId,
  razorpayConfigured = true,
  checkoutPlanId,
  onUpgrade,
}: PricingPlansGridProps) {
  const spacious = variant === "marketing";

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {PRICING_PLANS.map((plan) => {
        const isCurrent = variant === "app" && currentPlanId === plan.checkoutPlanId;
        const isHighlight =
          variant === "app" &&
          !!highlightPlanId &&
          (plan.checkoutPlanId === highlightPlanId || plan.id === highlightPlanId);
        const canUpgrade =
          variant === "app" &&
          plan.checkoutPlanId &&
          !isCurrent &&
          razorpayConfigured;

        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col border bg-card p-6 elev-1",
              spacious ? "rounded-2xl" : "rounded-2xl",
              plan.popular ? "border-accent ring-2 ring-accent/20" : "border-border",
              isCurrent && "border-accent/40 ring-2 ring-accent/15",
              isHighlight && !isCurrent && "border-amber-400 ring-2 ring-amber-300/40",
            )}
          >
            {plan.popular && !isCurrent && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                Most popular
              </span>
            )}
            {isCurrent && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                Current plan
              </span>
            )}
            {isHighlight && !isCurrent && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                Recommended
              </span>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            {"tagline" in plan && plan.tagline && (
              <p className="mt-1 text-sm font-medium text-accent">{plan.tagline}</p>
            )}
            {"forWho" in plan && plan.forWho && (
              <p className="mt-0.5 text-xs text-muted-foreground">{plan.forWho}</p>
            )}
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
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {variant === "marketing" ? (
              <Button
                asChild
                className="mt-6 w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                <Link href={plan.custom ? "/contact#enterprise" : "/register"}>
                  {plan.custom ? "Contact sales" : CTA.startTrial}
                </Link>
              </Button>
            ) : plan.custom ? (
              <Button asChild className="mt-6 w-full" variant="outline">
                <Link href="/contact#inquiry">Contact sales</Link>
              </Button>
            ) : (
              <Button
                type="button"
                className="mt-6 w-full"
                variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                disabled={isCurrent || !canUpgrade || checkoutPlanId === plan.checkoutPlanId}
                onClick={() => plan.checkoutPlanId && onUpgrade?.(plan.checkoutPlanId)}
              >
                {checkoutPlanId === plan.checkoutPlanId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                  "Current plan"
                ) : !razorpayConfigured ? (
                  "Unavailable"
                ) : variant === "app" &&
                  subscriptionStatus === "ACTIVE" &&
                  currentPlanId &&
                  currentPlanId !== "trial" ? (
                  <>
                    Switch plan <ExternalLink className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Upgrade <ExternalLink className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
