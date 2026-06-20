"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Can I keep my existing WhatsApp business number?",
    a: "Yes. Growvisi connects to your existing WhatsApp Business number on Meta's Cloud API. You keep the same number your customers already use.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect WhatsApp and receive their first classified lead within 15 minutes.",
  },
  {
    q: "Does AI reply to customers automatically?",
    a: "Growvisi classifies intent, scores leads, and updates your pipeline. Your team replies from the shared inbox — AI suggests replies but does not auto-reply by default.",
  },
  {
    q: "Can multiple agents use one WhatsApp number?",
    a: "Yes. Every team member shares one inbox with full conversation history and lead scores.",
  },
  {
    q: "Do I need Meta approval?",
    a: "You need WhatsApp Business on Meta's Cloud API. Growvisi guides you through API Setup; embedded signup comes after App Review.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days, full access, no credit card required.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 border-b border-border bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[720px] px-6">
        <h2 className="display-lg text-center">Common questions</h2>

        <div className="mt-12">
          {faqs.map((faq, i) => (
            <div key={faq.q} className="border-b border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-[15px] font-semibold">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open === i && "rotate-180",
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
                    <p className="pb-5 text-[14px] leading-relaxed text-muted-foreground">{faq.a}</p>
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
