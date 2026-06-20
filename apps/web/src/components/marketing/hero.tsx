"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";

const trustItems = [
  "Official WhatsApp API",
  "Setup in 15 Minutes",
  "Multi-Agent Inbox",
  "AI Lead Scoring",
];

export function Hero() {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="display-xl text-foreground">
            Turn WhatsApp Conversations Into Revenue
          </h1>
          <p className="body-lg mt-6 max-w-[520px]">
            Growvisi automatically analyzes conversations, scores buying intent, updates your
            pipeline, triggers follow-ups, and helps your team close more deals.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[15px]">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-outline inline-flex items-center rounded-lg px-6 py-3 text-[15px]">
              Book Demo
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Check className="h-4 w-4 text-accent" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="overflow-hidden rounded-2xl elev-2">
            <Image
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=85&auto=format&fit=crop"
              alt="Sales team collaborating on WhatsApp leads"
              width={640}
              height={480}
              className="h-auto w-full object-cover"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
