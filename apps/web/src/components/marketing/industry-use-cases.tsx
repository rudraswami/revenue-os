"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Car, GraduationCap, HeartPulse, Paintbrush, ShoppingBag } from "lucide-react";
import { SectionHeader } from "./section-header";

const industries = [
  {
    icon: Building2,
    title: "Real Estate",
    example: "Plot visits tracked from first WhatsApp ping",
    href: "/solutions/real-estate",
  },
  {
    icon: GraduationCap,
    title: "Education",
    example: "Admission leads scored by intent in Inbox",
    href: "/solutions/education",
  },
  {
    icon: HeartPulse,
    title: "Healthcare",
    example: "Appointment requests prioritized on Pipeline",
    href: "/solutions/healthcare",
  },
  { icon: Car, title: "Automotive", example: "Test-drive inquiries assigned to sales reps" },
  { icon: Paintbrush, title: "Interior Design", example: "Consultation pipeline with deal ₹ values" },
  {
    icon: ShoppingBag,
    title: "D2C",
    example: "Campaign click-to-WA attributed to won orders",
    href: "/solutions/d2c",
  },
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
            const inner = (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6cf8bb]/15">
                  <Icon className="h-5 w-5 text-[#6cf8bb]" strokeWidth={1.75} />
                </div>
                <p className="mt-4 flex items-center gap-1 text-[15px] font-bold text-white">
                  {item.title}
                  {item.href && (
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  )}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55 group-hover:text-white/70">
                  {item.example}
                </p>
              </>
            );
            const className =
              "group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-colors hover:border-[#6cf8bb]/40 hover:bg-white/[0.07]";

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3 }}
              >
                {item.href ? (
                  <Link href={item.href} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className}>{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
