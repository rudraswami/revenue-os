"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Kanban, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    id: "inbox",
    icon: Inbox,
    title: "Chat management",
    description:
      "Connect WhatsApp to one team inbox. Reply faster, assign conversations, and never lose the thread with customers.",
    visual: (
      <div className="space-y-3 p-6">
        {[
          { from: "them", text: "Hi, do you ship to Delhi?" },
          { from: "us", text: "Yes! 2–3 day delivery. Want me to send options?" },
          { from: "them", text: "Please, for a 3BHK setup" },
        ].map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              m.from === "us"
                ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm bg-muted",
            )}
          >
            {m.text}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "pipeline",
    icon: Kanban,
    title: "Pipeline management",
    description:
      "Automate your pipeline so every lead keeps moving, every rep knows what's next, and deals don't stall.",
    visual: (
      <div className="grid grid-cols-3 gap-3 p-6">
        {["New", "Qualified", "Won"].map((stage, i) => (
          <div key={stage} className="rounded-xl bg-muted/60 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{stage}</p>
            {Array.from({ length: 3 - i }).map((_, j) => (
              <div key={j} className="mb-2 rounded-lg border border-border bg-background p-2 shadow-sm">
                <div className="h-2 w-12 rounded bg-muted" />
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "automation",
    icon: Zap,
    title: "Smart automation",
    description:
      "AI-suggested replies, auto stage updates, and follow-up reminders — zero manual steps for routine work.",
    visual: (
      <div className="space-y-3 p-6">
        {[
          { label: "AI suggested reply", text: "Thanks for reaching out! Here's our catalog…" },
          { label: "Stage updated", text: "Lead moved to Qualified" },
          { label: "Follow-up scheduled", text: "Reminder set for tomorrow 10:00 AM" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="text-xs font-semibold text-primary">{item.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export function Features() {
  const [active, setActive] = useState(0);
  const feature = features[active];

  return (
    <section id="features" className="surface-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Platform</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Your all-in-one platform for growth
          </h2>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-3">
            {features.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "rounded-2xl border p-5 text-left transition-all",
                  active === i
                    ? "border-primary/30 bg-background shadow-md"
                    : "border-transparent bg-transparent hover:bg-background/60",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      active === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                {feature.visual}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
