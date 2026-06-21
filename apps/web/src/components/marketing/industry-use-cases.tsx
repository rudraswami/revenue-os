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
import { SectionHeader } from "./section-header";

const industries = [
  { icon: Building2, title: "Real Estate", example: "Plot visits booked from WhatsApp" },
  { icon: GraduationCap, title: "Education", example: "Admission leads scored by intent" },
  { icon: HeartPulse, title: "Healthcare", example: "Appointment requests prioritized" },
  { icon: Car, title: "Automotive", example: "Test drives scheduled automatically" },
  { icon: Paintbrush, title: "Interior Design", example: "Consultation pipeline tracked" },
  { icon: ShoppingBag, title: "D2C", example: "Cart abandoners re-engaged on WA" },
];

export function IndustryUseCases() {
  return (
    <section
      id="industries"
      className="scroll-mt-20 border-y border-white/10 bg-gradient-to-br from-[#0b1c30] via-[#132a45] to-[#0b1c30] py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          light
          label="Industries"
          title="Built for teams that sell on WhatsApp"
          subtitle="Same engine — tuned for how your industry closes."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-colors hover:border-[#6cf8bb]/40 hover:bg-white/[0.07]"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3 }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6cf8bb]/15">
                  <Icon className="h-5 w-5 text-[#6cf8bb]" strokeWidth={1.75} />
                </div>
                <p className="mt-4 text-[15px] font-bold text-white">{item.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55 group-hover:text-white/70">
                  {item.example}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
