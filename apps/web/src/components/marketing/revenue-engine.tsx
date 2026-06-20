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
  { icon: MessageSquare, label: "Message Received" },
  { icon: Brain, label: "AI Classifies Intent" },
  { icon: Target, label: "Lead Score Generated" },
  { icon: GitBranch, label: "Pipeline Updated" },
  { icon: RefreshCw, label: "Follow-Up Created" },
  { icon: Bell, label: "Hot Lead Alert" },
  { icon: Trophy, label: "Deal Won" },
  { icon: TrendingUp, label: "Revenue Reported" },
];

export function RevenueEngine() {
  return (
    <section id="engine" className="scroll-mt-20 border-b border-border bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <h2 className="display-lg text-foreground">
            How Growvisi Converts Conversations Into Revenue
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                className="elev-1 flex flex-col items-center rounded-2xl bg-white p-6 text-center"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: "0 8px 24px rgb(11 28 48 / 0.08)" }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5eeff] text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[13px] font-semibold leading-snug text-foreground">
                  {step.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
