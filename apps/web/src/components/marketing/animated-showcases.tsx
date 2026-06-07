"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "./mocks/product-mocks";
import { CrmChat, HERO_CHAT } from "./animated-chat";
import { cn } from "@/lib/utils";

const conversations = [
  { name: "Sarah Mitchell", preview: "Can I get a quote...", time: "now", unread: 2, active: true },
  { name: "Raj Patel", preview: "Thanks! When can we...", time: "15m", unread: 0, active: false },
  { name: "Emma Chen", preview: "Is delivery available...", time: "1h", unread: 1, active: false },
];

export function AnimatedInboxShowcase({ paused }: { paused?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % conversations.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  const active = conversations[activeIdx];

  return (
    <AppShell activeNav="inbox">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[200px] shrink-0 flex-col border-r border-border md:w-[220px]">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[14px] font-semibold">Inbox</p>
            <p className="text-[11px] text-muted-foreground">Live · 3 unread</p>
          </div>
          <div className="flex-1 p-2">
            {conversations.map((c, i) => (
              <motion.div
                key={c.name}
                animate={{
                  backgroundColor: i === activeIdx ? "rgb(237 233 254)" : "transparent",
                }}
                className="mb-1 rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <p className="truncate text-[13px] font-semibold">{c.name}</p>
                  <span className="text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{c.preview}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
                <div>
                  <p className="text-[14px] font-semibold">{active.name}</p>
                  <p className="text-[11px] text-success">● Active now</p>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  Score 82
                </motion.span>
              </div>
              <CrmChat messages={HERO_CHAT} paused={paused || activeIdx !== 0} />
              <div className="border-t border-border bg-white px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full border border-border bg-muted px-4 py-2.5 text-[13px] text-muted-foreground">
                    Type a message…
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                    →
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}

const PIPELINE_STAGES = ["New", "Qualified", "Proposal", "Won"];

export function AnimatedPipelineShowcase() {
  const [leadStage, setLeadStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLeadStage((s) => (s + 1) % PIPELINE_STAGES.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell activeNav="pipeline">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Pipeline</p>
        <p className="text-[11px] text-muted-foreground">Watch leads move automatically</p>
      </div>
      <div className="flex flex-1 gap-2 overflow-hidden p-4">
        {PIPELINE_STAGES.map((stage, colIdx) => (
          <div key={stage} className="min-w-[120px] flex-1 rounded-xl bg-muted p-2">
            <p className="mb-2 px-1 text-[11px] font-semibold">{stage}</p>
            <AnimatePresence mode="popLayout">
              {colIdx === leadStage && (
                <motion.div
                  key="lead-card"
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-lg border border-primary/30 bg-white p-2.5 shadow-md ring-2 ring-primary/20"
                >
                  <p className="text-[12px] font-semibold">Sarah Mitchell</p>
                  <p className="text-[10px] text-muted-foreground">WhatsApp lead</p>
                  <motion.div
                    className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"
                    initial={false}
                  >
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${30 + leadStage * 20}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </motion.div>
                </motion.div>
              )}
              {colIdx !== leadStage && colIdx < leadStage && (
                <div className="rounded-lg border border-border bg-white/60 p-2.5 opacity-50">
                  <p className="text-[11px] text-muted-foreground">Sarah Mitchell</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export function AnimatedDashboardShowcase() {
  const bars = [32, 48, 40, 72, 56, 88, 24];

  return (
    <AppShell activeNav="dashboard">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Home</p>
        <p className="text-[11px] text-muted-foreground">Live metrics</p>
      </div>
      <div className="flex-1 p-5">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "Conversations", value: 248 },
            { label: "Leads", value: 86 },
            { label: "Win rate", value: "34%" },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-white p-3 shadow-sm"
            >
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <motion.p
                key={String(m.value)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg font-bold"
              >
                {m.value}
              </motion.p>
            </motion.div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="mb-3 text-[12px] font-semibold">Leads by stage</p>
          <div className="flex h-[100px] items-end gap-1.5">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className="flex flex-1 flex-col items-center gap-1"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <motion.div
                  className="w-full rounded-t-md bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
