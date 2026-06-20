"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

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

function Cell({ value }: { value: boolean | "limited" }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-accent" strokeWidth={2.5} />;
  if (value === "limited") return <span className="text-xs text-muted-foreground">Limited</span>;
  return <X className="mx-auto h-5 w-5 text-muted-foreground/35" strokeWidth={2} />;
}

export function CompetitorComparison() {
  return (
    <section id="compare" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <motion.h2
          className="display-lg text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Why Growvisi wins
        </motion.h2>

        <motion.div
          className="mt-14 overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-foreground/10">
                <th className="pb-4 text-left text-sm font-semibold text-muted-foreground">Capability</th>
                <th className="pb-4 text-center text-sm font-semibold">WhatsApp Business</th>
                <th className="pb-4 text-center text-sm font-semibold">Wati</th>
                <th className="pb-4 text-center text-sm font-semibold">AiSensy</th>
                <th className="pb-4 text-center text-sm font-bold text-accent">Growvisi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-border/80">
                  <td className="py-4 text-[15px] font-medium">{row.feature}</td>
                  <td className="py-4 text-center"><Cell value={row.wa} /></td>
                  <td className="py-4 text-center"><Cell value={row.wati} /></td>
                  <td className="py-4 text-center"><Cell value={row.aisensy} /></td>
                  <td className="bg-accent/[0.04] py-4 text-center"><Cell value={row.growvisi} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
