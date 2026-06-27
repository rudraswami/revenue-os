"use client";

import { motion } from "framer-motion";

export function IntelligencePreview() {
  const rows = [
    { name: "Priya Sharma", intent: "Buying", stage: "Qualified", time: "Just now", hot: true },
    { name: "Raj Patel", intent: "Scheduling", stage: "Contacted", time: "15m ago", hot: false },
    { name: "Ananya Iyer", intent: "Pricing", stage: "Proposal", time: "1h ago", hot: false },
    { name: "Vikram Singh", intent: "Support", stage: "New", time: "3h ago", hot: false },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border bg-[#f8f9ff] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Contact</span>
        <span>Intent</span>
        <span>Stage</span>
      </div>
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0 ${
            r.hot ? "bg-[#ecfdf5]/60" : ""
          }`}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
        >
          <div>
            <p className="text-[13px] font-semibold">{r.name}</p>
            <p className="text-[11px] text-muted-foreground">{r.time}</p>
          </div>
          <span className="rounded-md bg-[#e5eeff] px-2 py-0.5 text-[10px] font-medium text-accent">
            {r.intent}
          </span>
          <span className={`text-[11px] font-medium ${r.hot ? "text-accent" : ""}`}>{r.stage}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function ScoringPreview() {
  const leads = [
    { name: "Priya Sharma", score: 92, bar: 92 },
    { name: "Raj Patel", score: 78, bar: 78 },
    { name: "Ananya Iyer", score: 64, bar: 64 },
  ];

  return (
    <div className="space-y-3">
      {leads.map((l, i) => (
        <motion.div
          key={l.name}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">{l.name}</span>
            <span className="font-bold text-accent">{l.score}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              whileInView={{ width: `${l.bar}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function PipelinePreview() {
  const stages = [
    { name: "New", count: 24, pct: 100 },
    { name: "Contacted", count: 18, pct: 75 },
    { name: "Qualified", count: 12, pct: 50 },
    { name: "Won", count: 5, pct: 21 },
  ];

  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold text-muted-foreground">Pipeline funnel</p>
      <div className="space-y-2.5">
        {stages.map((s, i) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="w-16 text-[11px] font-medium">{s.name}</span>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
              <motion.div
                className="flex h-full items-center rounded-md bg-accent/85 px-2 text-[10px] font-semibold text-white"
                initial={{ width: 0 }}
                whileInView={{ width: `${s.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                style={{ minWidth: s.pct > 15 ? "2rem" : undefined }}
              >
                {s.count}
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPreview() {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div className="mb-4 flex gap-6">
        <div>
          <p className="text-[11px] text-muted-foreground">Conversion</p>
          <p className="text-xl font-bold text-accent">34%</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Pipeline value</p>
          <p className="text-xl font-bold">₹12.4L</p>
        </div>
      </div>
      <div className="flex h-20 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={days[i]} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-t bg-accent/70"
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
            />
            <span className="text-[9px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InboxPreview() {
  const messages = [
    { from: "customer", text: "3BHK Whitefield budget 1.2Cr?", time: "10:02" },
    { from: "team", text: "Hi Priya — sharing floor plans today.", time: "10:08" },
    { from: "ai", text: "Intent: Buying · Score 91 · Handoff flagged", time: "" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border bg-[#f8f9ff] px-3 py-2 text-[11px] font-semibold">
        Priya Sharma · WhatsApp
      </div>
      <div className="space-y-2 p-3">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={
              m.from === "customer"
                ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-[12px]"
                : m.from === "team"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-accent px-3 py-2 text-[12px] text-white"
                  : "rounded-lg border border-accent/20 bg-bento-mint/50 px-2.5 py-1.5 text-[10px] font-medium text-accent"
            }
          >
            {m.text}
            {m.time && <p className="mt-0.5 text-[9px] opacity-60">{m.time}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AutomationsPreview() {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent">
        <span className="h-2 w-2 rounded-full bg-accent" />
        Morning digest · 7:00 IST
      </div>
      <div className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
        <p>
          Pipeline <strong className="text-foreground">₹18.4L</strong> · Won 24h{" "}
          <strong className="text-accent">₹2.1L</strong>
        </p>
        <p>
          Handoffs <strong className="text-amber-800">3</strong> · Unread{" "}
          <strong className="text-foreground">12</strong>
        </p>
        <p className="text-[10px] text-muted-foreground">Hindi digest supported</p>
      </div>
    </div>
  );
}
