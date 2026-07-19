"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader } from "./section-header";

const rows: {
  feature: string;
  wa: boolean | "limited";
  broadcast: boolean | "limited";
  growvisi: boolean | string;
}[] = [
  { feature: "Shared team inbox", wa: false, broadcast: true, growvisi: true },
  { feature: "Pipeline CRM with ₹ values", wa: false, broadcast: "limited", growvisi: true },
  { feature: "YOUR TURN — who owns the reply", wa: false, broadcast: false, growvisi: true },
  { feature: "AI intent + lead score", wa: false, broadcast: false, growvisi: true },
  { feature: "Revenue analytics (INR)", wa: false, broadcast: false, growvisi: true },
  { feature: "Growvisi auto-replies customers", wa: false, broadcast: "limited", growvisi: "Optional — guarded only" },
  { feature: "Broadcast / campaigns", wa: "limited", broadcast: true, growvisi: true },
];

function Cell({ value, highlight }: { value: boolean | "limited" | string; highlight?: boolean }) {
  if (value === true)
    return (
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Check
          className={`mx-auto h-5 w-5 ${highlight ? "text-accent" : "text-accent/80"}`}
          strokeWidth={2.5}
        />
      </motion.div>
    );
  if (value === "limited")
    return <span className="text-xs text-muted-foreground">Limited</span>;
  if (value === false)
    return <X className="mx-auto h-5 w-5 text-muted-foreground/30" strokeWidth={2} />;
  return <span className="text-xs font-semibold text-accent">{value}</span>;
}

export function CompetitorComparison() {
  return (
    <section id="compare" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          label="Compare"
          title="Revenue layer, not just broadcast"
          subtitle="Wati and AiSensy excel at campaigns. Growvisi closes the loop — inbox, YOUR TURN, pipeline ₹."
        />

        <motion.div
          className="mt-12 overflow-hidden rounded-3xl border border-border bg-white shadow-[0_16px_48px_rgb(11_28_48/0.06)]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-[#f8f9ff]">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Capability
                  </th>
                  <th className="px-3 py-4 text-center text-sm font-semibold">WhatsApp Business</th>
                  <th className="px-3 py-4 text-center text-sm font-semibold">
                    Broadcast tools
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                      Wati · AiSensy
                    </span>
                  </th>
                  <th className="bg-accent/[0.06] px-3 py-4 text-center text-sm font-bold text-accent">
                    Growvisi
                  </th>
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
                    transition={{ delay: i * 0.04 }}
                  >
                    <td className="px-5 py-4 text-[15px] font-medium">{row.feature}</td>
                    <td className="px-3 py-4 text-center">
                      <Cell value={row.wa} />
                    </td>
                    <td className="px-3 py-4 text-center">
                      <Cell value={row.broadcast} />
                    </td>
                    <td className="bg-accent/[0.04] px-3 py-4 text-center">
                      <Cell value={row.growvisi} highlight />
                    </td>
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
