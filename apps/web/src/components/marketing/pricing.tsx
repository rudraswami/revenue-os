"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: 999,
    description: "For solo founders and small businesses getting started with WhatsApp sales.",
    idealFor: "Small businesses, freelancers, consultants, local service providers.",
    features: [
      "1 WhatsApp Business Number",
      "2 Team Members",
      "Shared Team Inbox",
      "Basic Conversation Management",
      "Contact Management",
      "Lead Capture from WhatsApp",
      "Basic Sales Pipeline",
      "Manual Lead Assignment",
      "Conversation History",
      "Mobile Friendly Dashboard",
      "Up to 500 Leads / Month",
      "Email Support",
    ],
    popular: false,
    custom: false,
  },
  {
    name: "Growth",
    price: 2999,
    description: "For growing teams that need visibility, prioritization and better conversion.",
    idealFor: "Real Estate, Education, Clinics, Interior Designers, Automotive, D2C.",
    features: [
      "Everything in Starter",
      "Up to 5 Team Members",
      "Up to 3 WhatsApp Numbers",
      "Up to 3,000 Leads / Month",
      "AI Conversation Classification",
      "AI Lead Scoring",
      "Hot Lead Identification",
      "Pipeline Analytics",
      "Lead Source Tracking",
      "Team Performance Dashboard",
      "Deal Tracking",
      "Human Handoff Detection",
      "Advanced Filters & Search",
      "Priority Email Support",
    ],
    popular: true,
    custom: false,
  },
  {
    name: "Pro",
    price: 5999,
    description: "For businesses that want automation and scale.",
    idealFor: "Sales teams, multi-location businesses, franchises, high-volume lead ops.",
    features: [
      "Everything in Growth",
      "Unlimited Team Members",
      "Unlimited WhatsApp Numbers",
      "Up to 10,000 Leads / Month",
      "Automated Follow-up Reminders",
      "Auto Stage Updates",
      "Hot Lead Alerts",
      "Workflow Automations",
      "Revenue Analytics",
      "Conversion Funnel Reporting",
      "Custom Lead Scoring Rules",
      "Advanced Intelligence Module",
      "Role-Based Access Control",
      "API Access & Webhooks",
      "Priority Support & Onboarding",
    ],
    popular: false,
    custom: false,
  },
  {
    name: "Enterprise",
    price: null,
    description: "For organizations requiring advanced integrations and governance.",
    idealFor: "Large teams with custom compliance and integration needs.",
    features: [
      "Everything in Pro",
      "Unlimited Leads",
      "Dedicated Success Manager",
      "Custom Integrations",
      "SLA Support",
      "SSO",
      "Advanced Security Controls",
      "Custom Reporting",
      "Migration Assistance",
    ],
    popular: false,
    custom: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 surface-muted py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="section-label">Pricing</p>
          <h2 className="display-lg mt-3 text-foreground">Plans that grow with your sales team</h2>
          <p className="body-lg mx-auto mt-4 max-w-[520px]">
            Start free for 14 days. Upgrade when you need AI scoring, automation, and scale.
          </p>
        </div>

        <div className="mt-12 grid gap-5 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "card-lift relative flex flex-col overflow-hidden rounded-2xl border bg-white",
                plan.popular ? "border-primary shadow-xl ring-2 ring-primary/20 xl:scale-[1.03]" : "border-border shadow-sm",
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
                      <p className="mt-1 text-[13px] text-muted-foreground">Contact sales</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[15px] font-semibold text-muted-foreground">₹</span>
                        <span className="text-4xl font-bold tracking-tight">
                          {plan.price!.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground">per month</p>
                    </>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] leading-snug">
                      <span className="mt-0.5 shrink-0 text-primary">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 text-[11px] italic text-muted-foreground">
                  Ideal for: {plan.idealFor}
                </p>

                <Button
                  className={cn("mt-6 w-full font-bold", plan.popular && "btn-wa border-0")}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.custom ? "/contact" : "/register"}>
                    {plan.custom ? "Contact sales" : "Start free trial"}
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
