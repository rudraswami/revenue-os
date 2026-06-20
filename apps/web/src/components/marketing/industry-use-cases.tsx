"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Car,
  GraduationCap,
  HeartPulse,
  Paintbrush,
  ShoppingBag,
} from "lucide-react";

const industries = [
  { icon: Building2, title: "Real Estate" },
  { icon: GraduationCap, title: "Education" },
  { icon: HeartPulse, title: "Healthcare" },
  { icon: Car, title: "Automotive" },
  { icon: Paintbrush, title: "Interior Design" },
  { icon: ShoppingBag, title: "D2C" },
];

export function IndustryUseCases() {
  return (
    <section
      id="industries"
      className="scroll-mt-20 border-y border-border bg-gradient-to-r from-[#0b1c30] via-[#132a45] to-[#0b1c30] py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-[#6cf8bb]">
          Built for revenue teams
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {industries.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                className="flex flex-col items-center gap-3 text-white/90"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.05, color: "#fff" }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-[#6cf8bb]" strokeWidth={1.75} />
                </div>
                <span className="text-sm font-semibold">{item.title}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
