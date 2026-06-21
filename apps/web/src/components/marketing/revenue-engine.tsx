"use client";

import { useEffect, useState } from "react";
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
import { SectionHeader } from "./section-header";

const steps = [
  { icon: MessageSquare, label: "Message", desc: "Lead arrives on WhatsApp" },
  { icon: Brain, label: "Classify", desc: "AI reads intent" },
  { icon: Target, label: "Score", desc: "Hot leads surface" },
  { icon: GitBranch, label: "Pipeline", desc: "Stage auto-updates" },
  { icon: RefreshCw, label: "Follow-up", desc: "Nothing slips" },
  { icon: Bell, label: "Alert", desc: "Team notified" },
  { icon: Trophy, label: "Won", desc: "Deal closed" },
  { icon: TrendingUp, label: "Revenue", desc: "Tracked in INR" },
];

export function RevenueEngine() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="engine" className="scroll-mt-20 relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          label="The engine"
          title="One proactive flow — chat to closed deal"
          subtitle="Growvisi works in the background while your team sells."
        />

        <div className="mt-12 hidden lg:block">
          <div className="relative rounded-3xl border border-[#dce9ff] bg-white p-8 shadow-[0_16px_48px_rgb(11_28_48/0.06)]">
            <div className="absolute left-[8%] right-[8%] top-[52px] h-0.5 overflow-hidden rounded-full bg-[#e5eeff]">
              <motion.div
                className="h-full bg-gradient-to-r from-accent via-[#6cf8bb] to-accent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ width: "40%" }}
              />
            </div>
            <div className="flex justify-between">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === active;
                const isPast = i < active;
                return (
                  <motion.div
                    key={step.label}
                    className="flex max-w-[90px] flex-col items-center text-center"
                    animate={{ opacity: isActive || isPast ? 1 : 0.45 }}
                  >
                    <motion.div
                      className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl ring-1"
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        backgroundColor: isActive ? "rgb(0 108 73)" : isPast ? "rgb(236 253 245)" : "white",
                        boxShadow: isActive
                          ? "0 8px 32px rgb(0 108 73 / 0.35)"
                          : "0 4px 16px rgb(11 28 48 / 0.08)",
                        borderColor: isActive ? "rgb(0 108 73)" : "rgb(220 233 255)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    >
                      <Icon
                        className={`h-6 w-6 ${isActive ? "text-white" : isPast ? "text-accent" : "text-accent/70"}`}
                      />
                      {isActive && (
                        <motion.span
                          className="absolute -inset-1 rounded-2xl border-2 border-accent/40"
                          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                    <p className="mt-3 text-[12px] font-bold">{step.label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{step.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 lg:hidden">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === active;
            return (
              <motion.div
                key={step.label}
                className={`flex min-w-[108px] shrink-0 flex-col items-center rounded-2xl border p-3 ${
                  isActive ? "border-accent bg-[#ecfdf5]" : "border-border bg-white"
                }`}
                animate={{ scale: isActive ? 1.02 : 1 }}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                <p className="mt-2 text-[11px] font-bold">{step.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
