"use client";

import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import { cn } from "@/lib/utils";

type PricingPlansGridProps = {
  variant: "marketing" | "app";
  currentPlanId?: string;
  razorpayConfigured?: boolean;
  checkoutPlanId?: string | null;
  onUpgrade?: (planId: "starter" | "growth" | "pro") => void;
};

export function PricingPlansGrid({
  variant,
  currentPlanId,
  razorpayConfigured = true,
  checkoutPlanId,
  onUpgrade,
}: PricingPlansGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {PRICING_PLANS.map((plan, i) => {
        const isCurrent = variant === "app" && currentPlanId === plan.checkoutPlanId;
        const canUpgrade =
          variant === "app" &&
          plan.checkoutPlanId &&
          !isCurrent &&
          razorpayConfigured;

        return (
          <motion.div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-white p-6 shadow-[0_8px_32px_rgb(11_28_48/0.05)] transition-shadow",
              plan.popular ? "border-accent ring-2 ring-accent/20" : "border-border",
              isCurrent && "border-accent/40 ring-2 ring-accent/15",
            )}
            initial={variant === "marketing" ? { opacity: 0, y: 20 } : false}
            whileInView={variant === "marketing" ? { opacity: 1, y: 0 } : undefined}
            viewport={variant === "marketing" ? { once: true } : undefined}
            transition={variant === "marketing" ? { delay: i * 0.07 } : undefined}
            whileHover={variant === "marketing" ? { y: -4, boxShadow: "0 16px 48px rgb(11 28 48 / 0.1)" } : undefined}
          >
            {plan.popular && !isCurrent && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Most popular
              </span>
            )}
            {isCurrent && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Current plan
              </span>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            {"tagline" in plan && plan.tagline && (
              <p className="mt-1 text-[13px] font-medium text-accent">{plan.tagline}</p>
            )}
            {"forWho" in plan && plan.forWho && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{plan.forWho}</p>
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
            <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-muted-foreground">
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
                className="mt-6 w-full rounded-xl"
                variant={plan.popular ? "accent" : "outline"}
              >
                <Link href={plan.custom ? "/contact" : "/register"}>
                  {plan.custom ? "Contact sales" : CTA.startTrial}
                </Link>
              </Button>
            ) : plan.custom ? (
              <Button asChild className="mt-6 w-full rounded-xl" variant="outline">
                <Link href="/contact">Contact sales</Link>
              </Button>
            ) : (
              <Button
                type="button"
                className="mt-6 w-full rounded-xl"
                variant={isCurrent ? "outline" : plan.popular ? "accent" : "outline"}
                disabled={isCurrent || !canUpgrade || checkoutPlanId === plan.checkoutPlanId}
                onClick={() => plan.checkoutPlanId && onUpgrade?.(plan.checkoutPlanId)}
              >
                {checkoutPlanId === plan.checkoutPlanId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                  "Current plan"
                ) : !razorpayConfigured ? (
                  "Unavailable"
                ) : (
                  <>
                    Upgrade <ExternalLink className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
