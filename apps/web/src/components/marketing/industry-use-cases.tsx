"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import {
  Building2,
  Car,
  GraduationCap,
  HeartPulse,
  Paintbrush,
  ShoppingBag,
} from "lucide-react";

const industries = [
  { icon: Building2, title: "Real Estate", desc: "Track property enquiries from first message to site visit." },
  { icon: GraduationCap, title: "Education", desc: "Manage admissions and follow up every applicant." },
  { icon: HeartPulse, title: "Healthcare", desc: "Handle appointment requests without losing patients." },
  { icon: Car, title: "Automotive", desc: "Manage test drives, quotes, and financing questions." },
  { icon: Paintbrush, title: "Interior Design", desc: "Track quotations through to signed projects." },
  { icon: ShoppingBag, title: "D2C", desc: "Manage pre-sales and support before and after purchase." },
];

export function IndustryUseCases() {
  return (
    <section id="industries" className="scroll-mt-20 border-b border-border bg-[#f8f9ff] py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <h2 className="display-lg text-foreground">Built For Revenue Teams</h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                className="elev-1 rounded-2xl bg-white p-6"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <Icon className="h-6 w-6 text-accent" strokeWidth={1.75} />
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
