"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PhoneMockup } from "./phone-mockup";
import { WhatsAppChat, AI_PHONE_CHAT } from "./animated-chat";

const benefits = [
  "Reply 24/7 without burning out",
  "Stay on top of every comment",
  "Auto-create follow-ups from any chat",
  "Track which ads actually convert",
  "Spot your hottest leads right away",
];

export function AiSection() {
  return (
    <section id="ai" className="surface-ai py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-[13px] font-semibold text-primary shadow-sm">
              ✦ GrowthSync AI
            </div>
            <h2 className="display-lg text-foreground">
              The AI teammate your sales team deserves
            </h2>
            <Link
              href="/register"
              className="btn-gradient mt-8 inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold shadow-md"
            >
              Try it free for 14 days
              <ArrowRight className="h-4 w-4" />
            </Link>

            <ul className="mt-10 space-y-3">
              {benefits.map((benefit, i) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-pill rounded-2xl px-4 py-3 text-[14px] font-medium text-foreground"
                >
                  {benefit}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <PhoneMockup>
                <WhatsAppChat messages={AI_PHONE_CHAT} contactName="Essence Lab" />
              </PhoneMockup>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
