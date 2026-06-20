"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

const faqs = [
  {
    q: "Can I keep my existing WhatsApp business number?",
    a: "Yes. Growvisi connects to your existing WhatsApp Business number on Meta's Cloud API. You keep the same number your customers already use — we ingest conversations and power your revenue workflow.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect WhatsApp and receive their first classified lead within 15 minutes. Create your workspace, paste your Meta API token or complete embedded signup, and send one test message.",
  },
  {
    q: "Does AI reply to customers automatically?",
    a: "Growvisi classifies intent, scores leads, and updates your pipeline automatically. Your team replies from the shared inbox (or via Meta Business tools). AI suggests replies to help reps move faster — it does not run unattended auto-replies by default.",
  },
  {
    q: "Can multiple agents use one WhatsApp number?",
    a: "Yes. Every team member with access shares one inbox, sees conversation history, lead scores, and pipeline stage — so handoffs are seamless.",
  },
  {
    q: "Do I need Meta approval?",
    a: "You need a WhatsApp Business account on Meta's Cloud API. Growvisi guides you through API Setup with a temporary token today; one-click embedded signup is available after Meta App Review.",
  },
  {
    q: "What does AI lead scoring actually do?",
    a: "Every inbound message is classified for intent and buying stage. Growvisi generates a lead score and can auto-update pipeline stages — so reps focus on hot opportunities first.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — try Growvisi free for 14 days with full access. No credit card required to start.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. No long-term contracts on standard plans. Upgrade, downgrade, or cancel from your workspace.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[720px] px-6">
        <ScrollReveal className="text-center">
          <p className="section-label">FAQ</p>
          <h2 className="display-lg mt-3 text-foreground">Common questions</h2>
        </ScrollReveal>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={faq.q} delay={i * 0.03}>
              <div className="overflow-hidden rounded-xl border border-border bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
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
                    >
                      <p className="border-t border-border px-5 pb-4 pt-2 text-[14px] leading-relaxed text-muted-foreground">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
