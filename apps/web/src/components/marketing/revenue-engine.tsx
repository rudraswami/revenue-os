import {
  ArrowDown,
  Bell,
  Brain,
  GitBranch,
  MessageSquare,
  RefreshCw,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const steps = [
  { icon: MessageSquare, label: "Customer Message", color: "bg-[#25D366]/15 text-[#128C7E]" },
  { icon: Brain, label: "AI Classifies Intent", color: "bg-primary/10 text-primary" },
  { icon: Target, label: "Lead Score Generated", color: "bg-violet-100 text-violet-700" },
  { icon: GitBranch, label: "Pipeline Updated", color: "bg-blue-100 text-blue-700" },
  { icon: RefreshCw, label: "Follow-Up Created", color: "bg-amber-100 text-amber-800" },
  { icon: Bell, label: "Hot Lead Alert", color: "bg-orange-100 text-orange-700" },
  { icon: Trophy, label: "Deal Won", color: "bg-success/15 text-success" },
  { icon: TrendingUp, label: "Revenue Reported", color: "bg-primary-soft text-primary" },
];

export function RevenueEngine() {
  return (
    <section id="engine" className="scroll-mt-20 surface-lavender py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[720px] text-center">
          <p className="section-label">The Growvisi Engine</p>
          <h2 className="display-lg mt-3 text-foreground">
            How Growvisi Converts Conversations Into Revenue
          </h2>
          <p className="body-lg mx-auto mt-4 max-w-[560px]">
            Every inbound WhatsApp message flows through one system — from first reply to closed
            deal.
          </p>
        </ScrollReveal>

        <div className="mt-14">
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <ScrollReveal key={step.label} delay={i * 0.04} className="w-full">
                  <div className="flex w-full flex-col items-center">
                    <div className="flex w-full max-w-md items-center gap-4 rounded-2xl border border-border/80 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${step.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-[15px] font-semibold text-foreground">{step.label}</p>
                    </div>
                    {i < steps.length - 1 && (
                      <ArrowDown className="my-2 h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
