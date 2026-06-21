"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0b1c30] py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_108_73/0.2),transparent_65%)]" />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6cf8bb]/5 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-[720px] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[#6cf8bb]">
            Get started today
          </p>
          <h2 className="display-lg mt-3 text-white">
            Turn WhatsApp into your best sales channel
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/70">
            Join teams across India closing more deals with less chaos.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-[15px] shadow-lg shadow-accent/25"
            >
              Start 14-Day Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Book a demo
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
