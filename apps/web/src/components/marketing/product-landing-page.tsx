"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ProductPageData, ProductPageSlug } from "@/lib/product-pages";
import { CTA } from "@/lib/brand-copy";
import { MarketingHeader } from "./header";
import { MarketingFooter } from "./footer";
import {
  AnalyticsPreview,
  AutomationsPreview,
  InboxPreview,
  IntelligencePreview,
  PipelinePreview,
  ScoringPreview,
} from "./dashboard-previews";

const PREVIEWS: Record<ProductPageSlug, React.ComponentType> = {
  conversations: InboxPreview,
  intelligence: ScoringPreview,
  pipeline: PipelinePreview,
  analytics: AnalyticsPreview,
  automations: AutomationsPreview,
};

export function ProductLandingPage({
  product,
  siblings,
}: {
  product: ProductPageData;
  siblings: ProductPageData[];
}) {
  const Preview = PREVIEWS[product.slug];
  const Icon = product.icon;

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <section className={`relative overflow-hidden bg-gradient-to-br ${product.accent} py-16 md:py-24`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_20%,rgb(0_108_73/0.08),transparent_55%)]" />
          <div className="relative mx-auto grid max-w-[1100px] items-center gap-12 px-6 lg:grid-cols-2 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white/80 px-3 py-1 text-xs font-semibold text-accent">
                <Icon className="h-3.5 w-3.5" />
                {product.eyebrow}
              </span>
              <h1
                className="mt-5 text-foreground"
                style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
              >
                {product.headline}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{product.subhead}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3">
                  {CTA.startTrial}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/contact" className="btn-outline inline-flex items-center rounded-xl px-6 py-3">
                  {CTA.bookDemo}
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{product.proofLine}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/80 bg-white/90 p-4 shadow-[0_24px_80px_rgb(11_28_48/0.1)] backdrop-blur-sm"
            >
              <Preview />
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
            <h2 className="text-2xl font-bold">What you get</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {product.features.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="rounded-2xl border border-[#dce9ff] bg-white p-5 shadow-sm"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <p className="mt-3 font-bold">{f.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {product.slug === "intelligence" && (
          <section className="border-y border-border bg-[#f8f9ff] py-12">
            <div className="mx-auto max-w-[480px] px-6">
              <IntelligencePreview />
            </div>
          </section>
        )}

        <section className="border-t border-border bg-white py-14">
          <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">More in Growvisi</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {siblings
                .filter((s) => s.slug !== product.slug)
                .map((s) => (
                  <Link
                    key={s.slug}
                    href={`/product/${s.slug}`}
                    className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-bento-mint/30"
                  >
                    {s.navLabel}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
