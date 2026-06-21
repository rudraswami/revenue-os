"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

const faqs = [
  {
    q: "Can I keep my existing WhatsApp business number?",
    a: "Yes. Growvisi connects to your existing WhatsApp Business number on Meta's Cloud API. Your customers keep messaging the same number.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect WhatsApp and get their first AI-classified lead within 15 minutes.",
  },
  {
    q: "Does AI reply to customers automatically?",
    a: "Growvisi classifies, scores, and updates your pipeline. Your team replies from the shared inbox — AI suggests replies but does not auto-send by default.",
  },
  {
    q: "Can multiple agents use one WhatsApp number?",
    a: "Yes. Everyone shares one inbox with full history, lead scores, and pipeline stages.",
  },
  {
    q: "Do I need Meta approval?",
    a: "You need WhatsApp Business on Meta's Cloud API. Growvisi guides you through setup step by step.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days, full access, no credit card required.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[720px] px-6">
        <SectionHeader title="Common questions" subtitle="Everything teams ask before switching." />

        <div className="mt-10 overflow-hidden rounded-3xl border border-[#dce9ff] bg-[#f8f9ff]/50 divide-y divide-[#dce9ff]">
          {faqs.map((faq, i) => (
            <div key={faq.q}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white sm:px-6 sm:py-5"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-[15px] font-semibold">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    open === i && "rotate-180 text-accent",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-[14px] leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
