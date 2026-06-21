"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader } from "./section-header";

const rows: {
  feature: string;
  wa: boolean | "limited";
  wati: boolean | "limited";
  aisensy: boolean | "limited";
  growvisi: boolean;
}[] = [
  { feature: "Shared Inbox", wa: false, wati: true, aisensy: true, growvisi: true },
  { feature: "Pipeline CRM", wa: false, wati: "limited", aisensy: "limited", growvisi: true },
  { feature: "AI Intent Detection", wa: false, wati: false, aisensy: false, growvisi: true },
  { feature: "Lead Scoring", wa: false, wati: false, aisensy: false, growvisi: true },
  { feature: "Revenue Analytics", wa: false, wati: false, aisensy: false, growvisi: true },
  { feature: "Auto Stage Updates", wa: false, wati: false, aisensy: false, growvisi: true },
];

function Cell({ value, highlight }: { value: boolean | "limited"; highlight?: boolean }) {
  if (value === true)
    return (
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Check className={`mx-auto h-5 w-5 ${highlight ? "text-accent" : "text-accent/80"}`} strokeWidth={2.5} />
      </motion.div>
    );
  if (value === "limited") return <span className="text-xs text-muted-foreground">Limited</span>;
  return <X className="mx-auto h-5 w-5 text-muted-foreground/30" strokeWidth={2} />;
}

export function CompetitorComparison() {
  return (
    <section id="compare" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          label="Compare"
          title="Why revenue teams pick Growvisi"
          subtitle="Broadcast tools send messages. Growvisi closes deals."
        />

        <motion.div
          className="mt-12 overflow-hidden rounded-3xl border border-[#dce9ff] bg-white shadow-[0_16px_48px_rgb(11_28_48/0.06)]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-[#f8f9ff]">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-muted-foreground">Capability</th>
                  <th className="px-3 py-4 text-center text-sm font-semibold">WhatsApp Business</th>
                  <th className="px-3 py-4 text-center text-sm font-semibold">Wati</th>
                  <th className="px-3 py-4 text-center text-sm font-semibold">AiSensy</th>
                  <th className="bg-accent/[0.06] px-3 py-4 text-center text-sm font-bold text-accent">Growvisi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.feature}
                    className="border-b border-border/60 last:border-0"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <td className="px-5 py-4 text-[15px] font-medium">{row.feature}</td>
                    <td className="px-3 py-4 text-center"><Cell value={row.wa} /></td>
                    <td className="px-3 py-4 text-center"><Cell value={row.wati} /></td>
                    <td className="px-3 py-4 text-center"><Cell value={row.aisensy} /></td>
                    <td className="bg-accent/[0.04] px-3 py-4 text-center"><Cell value={row.growvisi} highlight /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
