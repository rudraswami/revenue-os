"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { ProductShowcase } from "./product-showcase";

export function LiveDemoSection() {
  return (
    <section className="surface-lavender py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal>
            <p className="section-label">See it live</p>
            <h2 className="display-lg mt-3 text-foreground">
              Watch conversations turn into pipeline
            </h2>
            <p className="body-lg mt-4">
              Explore Inbox, Intelligence, Pipeline, and Analytics — the same views your team uses
              after connecting WhatsApp. No signup required.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/demo" className="btn-wa inline-flex h-12 items-center gap-2 rounded-full px-7 text-[14px] font-bold">
                <Play className="h-4 w-4 fill-white" />
                Open interactive demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-white px-7 text-[14px] font-semibold shadow-sm transition-all hover:shadow-md"
              >
                Book a walkthrough
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <motion.div
              className="relative"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
                <ProductShowcase />
              </div>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
