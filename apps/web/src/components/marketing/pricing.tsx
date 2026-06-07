import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "0",
    period: "forever",
    description: "For small teams getting started on WhatsApp",
    features: ["1 WhatsApp number", "500 conversations/mo", "Basic pipeline", "2 team members"],
    cta: "Get started free",
    popular: false,
  },
  {
    name: "Growth",
    price: "29",
    period: "per user/month",
    description: "For growing teams — automate chats with smarter tools",
    features: [
      "3 WhatsApp numbers",
      "Unlimited conversations",
      "AI reply suggestions",
      "Full pipeline + analytics",
      "10 team members",
    ],
    cta: "Try it free",
    popular: true,
  },
  {
    name: "Scale",
    price: "59",
    period: "per user/month",
    description: "For mature teams — scale with advanced automation",
    features: [
      "Unlimited WhatsApp numbers",
      "Priority AI features",
      "Custom automations",
      "API access",
      "Unlimited team members",
    ],
    cta: "Try it free",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Go from overwhelmed to slam-dunk success
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free, upgrade when you&apos;re ready. No credit card required.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                plan.popular
                  ? "border-primary shadow-lg ring-1 ring-primary/20"
                  : "border-border bg-background",
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link href="/register">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
