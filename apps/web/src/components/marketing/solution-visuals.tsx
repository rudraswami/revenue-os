"use client";

import { motion } from "framer-motion";
import type { SolutionPageSlug } from "@/lib/solution-pages";

export function SolutionHeroVisual({ slug }: { slug: SolutionPageSlug }) {
  switch (slug) {
    case "real-estate":
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6cf8bb]">New inquiry</p>
            <p className="mt-2 text-sm text-white/90">“3BHK Sarjapur, budget 1.1Cr — site visit Saturday?”</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-[#6cf8bb]/20 px-2 py-0.5 text-[10px] font-semibold text-[#6cf8bb]">
                Buying · 94
              </span>
              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Handoff
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["New", "Site visit", "Won"].map((s, i) => (
              <div
                key={s}
                className={`rounded-lg border px-2 py-3 text-center ${i === 1 ? "border-[#6cf8bb]/40 bg-[#6cf8bb]/10" : "border-white/10 bg-white/5"}`}
              >
                <p className="text-[10px] text-white/50">{s}</p>
                <p className="text-lg font-bold text-white">{[24, 8, 3][i]}</p>
              </div>
            ))}
          </div>
          <p className="text-right text-xs font-semibold text-[#6cf8bb]">Pipeline ₹ 2.4Cr</p>
        </div>
      );
    case "education":
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Admission WA</p>
            <p className="mt-2 text-sm text-white/90">“NEET 2026 batch — fees and demo class?”</p>
            <p className="mt-2 text-xs text-white/50">Assigned → Counsellor Ananya</p>
          </div>
          <div className="flex gap-2">
            {["Inquiry", "Demo", "Enrolled"].map((s, i) => (
              <div key={s} className="flex-1 rounded-lg bg-violet-500/20 py-2 text-center">
                <p className="text-[9px] text-white/60">{s}</p>
                <p className="text-sm font-bold text-white">{[142, 38, 12][i]}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "healthcare":
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
            <p className="text-[10px] font-bold uppercase text-red-300">Urgent · Handoff</p>
            <p className="mt-2 text-sm text-white/90">“Need MRI slot tomorrow morning”</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] text-white/50">Coordinator replied · 4m ago</p>
            <p className="mt-1 text-sm text-white/80">“Slot confirmed 9 AM — please bring referral”</p>
          </div>
        </div>
      );
    case "d2c":
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase text-pink-300">From Instagram ad</p>
            <p className="mt-2 text-sm text-white/90">“Is the vitamin C serum in stock? COD?”</p>
            <span className="mt-2 inline-block rounded-md bg-pink-500/20 px-2 py-0.5 text-[10px] font-semibold text-pink-200">
              Ready to buy · 88
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#6cf8bb]/30 bg-[#6cf8bb]/10 px-4 py-3">
            <span className="text-xs text-white/70">Razorpay → Won</span>
            <span className="text-sm font-bold text-[#6cf8bb]">₹1,299</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function SolutionWorkflowDiagram({ slug }: { slug: SolutionPageSlug }) {
  const labels: Record<SolutionPageSlug, string[]> = {
    "real-estate": ["WhatsApp ping", "Classify", "Site visit", "Booking ₹"],
    education: ["Parent WA", "Score", "Demo", "Enrolled"],
    healthcare: ["Patient WA", "Prioritize", "Reply", "Visit"],
    d2c: ["Ad click", "Score", "Order chat", "Paid ₹"],
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-0">
      {labels[slug].map((label, i) => (
        <motion.div
          key={label}
          className="flex items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="min-w-[100px] rounded-xl border border-border bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-xs font-bold text-accent">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-1 text-[13px] font-semibold">{label}</p>
          </div>
          {i < labels[slug].length - 1 && (
            <div className="mx-1 hidden h-px w-6 bg-accent/40 md:block" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
