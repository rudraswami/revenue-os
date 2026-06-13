"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

const faqs = [
  {
    q: "Do I need a WhatsApp Business account?",
    a: "Yes. Growvisi connects to your WhatsApp Business API number through Meta's official embedded signup. If you use WhatsApp on your phone for business today, we guide you through linking it.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect WhatsApp and receive their first message within 15 minutes. Create your workspace, complete Meta signup, and you're live.",
  },
  {
    q: "Can my whole team use one inbox?",
    a: "Yes. Every team member with access can view and reply to conversations. Unread counts and lead timelines keep everyone aligned.",
  },
  {
    q: "What does the AI actually do?",
    a: "AI suggests replies based on conversation context, scores lead intent, auto-updates pipeline stages, and surfaces your hottest leads — so reps focus on closing.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — try Growvisi free for 14 days with full access. No credit card required to start.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term contracts on standard plans. Upgrade, downgrade, or cancel from your workspace settings.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 surface-muted py-24 md:py-32">
      <div className="mx-auto max-w-[720px] px-6">
        <ScrollReveal className="text-center">
          <p className="section-label">FAQ</p>
          <h2 className="display-lg mt-3 text-foreground">Common questions</h2>
        </ScrollReveal>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={faq.q} delay={i * 0.05}>
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
