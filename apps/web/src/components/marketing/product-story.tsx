"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ProductShowcase } from "./product-showcase";
import { SectionHeader } from "./section-header";

/** Slim product section — one live showcase, no redundant feature grid */
export function ProductStory() {
  return (
    <section id="product" className="scroll-mt-20 relative overflow-hidden bg-[#0b1c30] py-16 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_108_73/0.18),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          light
          center
          label="Product"
          title="Your team's command center"
          subtitle="Conversations, YOUR TURN, pipeline ₹, and analytics — one workspace for WhatsApp sales."
        />
        <motion.div
          className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <ProductShowcase />
        </motion.div>
        <div className="mt-8 text-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full border border-[#6cf8bb]/40 bg-[#6cf8bb]/10 px-5 py-2.5 text-[14px] font-semibold text-[#6cf8bb] transition-colors hover:bg-[#6cf8bb]/20"
          >
            Open interactive demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
