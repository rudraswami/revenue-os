"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ProductShowcase } from "./product-showcase";
import { SectionHeader } from "./section-header";
import {
  AnalyticsPreview,
  IntelligencePreview,
  PipelinePreview,
  ScoringPreview,
} from "./dashboard-previews";

const stories = [
  {
    id: "intelligence",
    label: "Intelligence",
    title: "Every conversation, understood instantly",
    body: "AI tags purchase intent, urgency, and sentiment the moment a WhatsApp message lands.",
    Visual: IntelligencePreview,
    accent: "from-[#e5eeff] to-[#f8f9ff]",
  },
  {
    id: "scoring",
    label: "Lead scoring",
    title: "Know who to call first",
    body: "Scores refresh live — reps focus on buyers ready to close, not browsers.",
    Visual: ScoringPreview,
    accent: "from-[#ecfdf5] to-[#f8f9ff]",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    title: "Deals move without manual updates",
    body: "Stages sync with conversation intent. Drag when needed — AI handles the rest.",
    Visual: PipelinePreview,
    accent: "from-[#e8f0ff] to-[#f8f9ff]",
  },
  {
    id: "analytics",
    label: "Revenue",
    title: "See conversion, not just messages",
    body: "Funnel metrics and pipeline value in INR — tied to WhatsApp, not spreadsheets.",
    Visual: AnalyticsPreview,
    accent: "from-[#f0fdf4] to-[#f8f9ff]",
  },
];

export function ProductStory() {
  return (
    <section id="product" className="scroll-mt-20">
      <div className="border-b border-border bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
          <SectionHeader
            label="Product"
            title="Built to close, not just chat"
            subtitle="Four layers that turn WhatsApp into a revenue system."
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {stories.map((story, i) => {
            const Visual = story.Visual;
            return (
              <motion.article
                key={story.id}
                className={`overflow-hidden rounded-3xl border border-[#dce9ff] bg-gradient-to-br ${story.accent} shadow-[0_12px_40px_rgb(11_28_48/0.05)]`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                whileHover={{ y: -4, boxShadow: "0 20px 48px rgb(11 28 48 / 0.08)" }}
              >
                <div className="border-b border-[#dce9ff]/80 bg-white/60 px-5 py-4">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                    {story.label}
                  </span>
                  <h3 className="mt-2 text-lg font-bold tracking-tight md:text-xl">{story.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{story.body}</p>
                </div>
                <div className="p-5">
                  <div className="overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-[#dce9ff]">
                    <Visual />
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-hidden bg-[#0b1c30] py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_108_73/0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
          <SectionHeader
            light
            center
            title="Your team's command center"
            subtitle="Inbox, intelligence, pipeline, and analytics — one workspace."
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
      </div>
    </section>
  );
}
