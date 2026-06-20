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

const steps = [
  { icon: MessageSquare, label: "Message" },
  { icon: Brain, label: "Classify" },
  { icon: Target, label: "Score" },
  { icon: GitBranch, label: "Pipeline" },
  { icon: RefreshCw, label: "Follow-up" },
  { icon: Bell, label: "Alert" },
  { icon: Trophy, label: "Won" },
  { icon: TrendingUp, label: "Revenue" },
];

export function RevenueEngine() {
  return (
    <section id="engine" className="scroll-mt-20 relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]" />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="section-label">The engine</p>
          <h2 className="display-lg mt-2 text-foreground">
            One flow from chat to closed deal
          </h2>
        </motion.div>

        {/* Cinematic horizontal pipeline */}
        <div className="relative mt-16 hidden lg:block">
          <div className="absolute left-[6%] right-[6%] top-[28px] h-0.5 bg-gradient-to-r from-accent via-primary/30 to-accent" />
          <div className="flex justify-between">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <motion.div
                    className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_4px_24px_rgb(11_28_48/0.12)] ring-1 ring-border"
                    whileHover={{ scale: 1.08, boxShadow: "0 8px 32px rgb(0 108 73 / 0.2)" }}
                  >
                    <Icon className="h-6 w-6 text-accent" />
                  </motion.div>
                  <p className="mt-4 text-[12px] font-semibold text-foreground">{step.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: scrolling strip */}
        <div className="mt-12 flex gap-4 overflow-x-auto pb-4 lg:hidden">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                className="flex min-w-[100px] shrink-0 flex-col items-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-border">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-2 text-[11px] font-semibold">{step.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
