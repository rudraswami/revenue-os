"use client";

import {
  Bell,
  Brain,
  GitBranch,
  MessageSquare,
  RefreshCw,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

const steps = [
  { icon: MessageSquare, label: "Customer Message", color: "from-[#25D366] to-[#128C7E]" },
  { icon: Brain, label: "AI Classifies Intent", color: "from-primary to-violet-600" },
  { icon: Target, label: "Lead Score", color: "from-orange-400 to-amber-500" },
  { icon: GitBranch, label: "Pipeline Updated", color: "from-blue-400 to-blue-600" },
  { icon: RefreshCw, label: "Follow-Up", color: "from-amber-400 to-orange-500" },
  { icon: Bell, label: "Hot Lead Alert", color: "from-red-400 to-orange-500" },
  { icon: Trophy, label: "Deal Won", color: "from-emerald-400 to-green-600" },
  { icon: TrendingUp, label: "Revenue", color: "from-primary to-[#7c3aed]" },
];

export function RevenueEngine() {
  return (
    <section id="engine" className="scroll-mt-20 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[720px] text-center">
          <p className="section-label">The Growvisi Engine</p>
          <h2 className="display-lg mt-3 text-foreground">
            How Growvisi Converts Conversations Into Revenue
          </h2>
          <p className="body-lg mx-auto mt-4 max-w-[560px]">
            Every inbound message flows through one system — live, automatic, end to end.
          </p>
        </ScrollReveal>

        {/* Desktop: horizontal pipeline */}
        <div className="mt-16 hidden lg:block">
          <div className="relative flex items-center justify-between gap-1">
            <div className="absolute left-8 right-8 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[#25D366] via-primary to-[#7c3aed] opacity-30" />
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  className="relative z-10 flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                >
                  <motion.div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>
                  <p className="mt-3 max-w-[88px] text-center text-[11px] font-semibold leading-tight">
                    {step.label}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical cards */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:hidden">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-[14px] font-semibold">{step.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
