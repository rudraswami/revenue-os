"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CrmChat, BENTO_CHAT, WhatsAppChat, AI_PHONE_CHAT } from "./animated-chat";
import { PhoneMockup } from "./phone-mockup";
import { cn } from "@/lib/utils";

function BentoCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className={cn("overflow-hidden rounded-3xl p-6 md:p-8", className)}
    >
      {children}
    </motion.div>
  );
}

export function BentoFeatures() {
  const [pipelineStage, setPipelineStage] = useState(0);

  return (
    <section id="features" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[560px] text-center">
          <h2 className="display-lg text-foreground">
            Your all-in-one platform for growth
          </h2>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 md:gap-5">
          {/* Chat management — purple bento */}
          <BentoCard className="bg-bento-purple md:row-span-1">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div>
                <h3 className="text-xl font-bold md:text-2xl">Chat management</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                  Connect WhatsApp to one AI-powered inbox. Reply faster and never lose the thread.
                </p>
                <Link
                  href="/register"
                  className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-[11px] font-semibold">Team Inbox</p>
                </div>
                <CrmChat messages={BENTO_CHAT} />
              </div>
            </div>
          </BentoCard>

          {/* Pipeline — mint bento */}
          <BentoCard className="bg-bento-mint">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div className="order-2 md:order-1">
                <div className="flex gap-2 overflow-hidden rounded-xl bg-white/80 p-3 shadow-sm">
                  {["New", "Qualified", "Won"].map((stage, i) => (
                    <div
                      key={stage}
                      className="min-w-[80px] flex-1 rounded-lg bg-muted/80 p-2"
                      onMouseEnter={() => setPipelineStage(i)}
                    >
                      <p className="mb-2 text-[10px] font-semibold">{stage}</p>
                      {i === pipelineStage && (
                        <motion.div
                          layoutId="bento-lead"
                          className="rounded-md border border-success/40 bg-white p-2 shadow-sm"
                        >
                          <p className="text-[10px] font-medium">Sarah M.</p>
                          <div className="mt-1 h-1 rounded-full bg-success" style={{ width: `${40 + i * 25}%` }} />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-xl font-bold md:text-2xl">Pipeline management</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                  Automate your pipeline so every lead keeps moving and nothing slips through.
                </p>
                <Link
                  href="/register"
                  className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-success hover:underline"
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </BentoCard>

          {/* Booking / AI — blue bento full width */}
          <BentoCard className="bg-bento-blue md:col-span-2">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-bold md:text-2xl">AI-powered chat on WhatsApp</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                  Supercharge productivity with AI that suggests replies, updates orders, and keeps
                  customers happy — right inside WhatsApp.
                </p>
                <Link
                  href="/register"
                  className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="flex justify-center">
                <PhoneMockup>
                  <WhatsAppChat messages={AI_PHONE_CHAT} contactName="Essence Lab" />
                </PhoneMockup>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
