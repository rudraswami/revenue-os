"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InboxMock, PipelineMock, DashboardMock } from "./mocks/product-mocks";

const features = [
  {
    id: "inbox",
    label: "Chat management",
    title: "Connect WhatsApp to one team inbox",
    description:
      "Reply faster and never lose the thread. Every customer message lands in one place — assign, tag, and respond as a team.",
    Mock: InboxMock,
  },
  {
    id: "pipeline",
    label: "Pipeline management",
    title: "Automate your pipeline so every lead keeps moving",
    description:
      "See where every customer is in the buying journey. Drag leads through stages and know exactly what each rep should do next.",
    Mock: PipelineMock,
  },
  {
    id: "dashboard",
    label: "Sales analytics",
    title: "Track performance without spreadsheets",
    description:
      "Conversations, leads, win rate — all in one dashboard. Understand what is working and where deals stall.",
    Mock: DashboardMock,
  },
];

export function Features() {
  const [active, setActive] = useState(0);
  const feature = features[active];
  const Mock = feature.Mock;

  return (
    <section id="features" className="surface-muted py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[560px] text-center">
          <p className="section-label">Platform</p>
          <h2 className="display-lg mt-3 text-foreground">
            Your all-in-one platform for growth
          </h2>
        </div>

        <div className="mt-10 flex justify-center gap-2">
          {features.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full px-5 py-2 text-[13px] font-medium transition-all",
                active === i
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={feature.id + "-copy"}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold tracking-tight md:text-[28px]">{feature.title}</h3>
              <p className="body-lg mt-4">{feature.description}</p>
              <Link
                href="/register"
                className="mt-6 inline-flex text-[15px] font-semibold text-primary hover:text-[var(--color-primary-hover)]"
              >
                Try it free →
              </Link>
            </motion.div>
          </AnimatePresence>

          <div className="product-frame-glow">
            <AnimatePresence mode="wait">
              <motion.div
                key={feature.id + "-mock"}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35 }}
              >
                <Mock compact />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
