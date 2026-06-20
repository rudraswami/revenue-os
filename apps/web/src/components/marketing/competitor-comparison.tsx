import { Check, X } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { cn } from "@/lib/utils";

const rows: { feature: string; wa: boolean | "limited"; wati: boolean | "limited"; aisensy: boolean | "limited"; growvisi: boolean }[] = [
  { feature: "Shared Inbox", wa: false, wati: true, aisensy: true, growvisi: true },
  { feature: "Pipeline CRM", wa: false, wati: "limited", aisensy: "limited", growvisi: true },
  { feature: "AI Intent Detection", wa: false, wati: false, aisensy: false, growvisi: true },
  { feature: "Lead Scoring", wa: false, wati: false, aisensy: false, growvisi: true },
  { feature: "Revenue Analytics", wa: false, wati: false, aisensy: false, growvisi: true },
  { feature: "Auto Stage Updates", wa: false, wati: false, aisensy: false, growvisi: true },
];

function Cell({ value }: { value: boolean | "limited" }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-accent" strokeWidth={2.5} />;
  }
  if (value === "limited") {
    return <span className="text-[12px] text-muted-foreground">Limited</span>;
  }
  return <X className="mx-auto h-5 w-5 text-muted-foreground/40" strokeWidth={2} />;
}

export function CompetitorComparison() {
  return (
    <section id="compare" className="scroll-mt-20 border-b border-border bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <h2 className="display-lg text-foreground">Why Growvisi Wins</h2>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-4 text-left text-[13px] font-semibold text-muted-foreground">
                  Capability
                </th>
                <th className="px-4 py-4 text-center text-[13px] font-semibold">WhatsApp Business</th>
                <th className="px-4 py-4 text-center text-[13px] font-semibold">Wati</th>
                <th className="px-4 py-4 text-center text-[13px] font-semibold">AiSensy</th>
                <th className="px-4 py-4 text-center text-[13px] font-bold text-accent">Growvisi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={cn("border-b border-border/60", i % 2 === 1 && "bg-[#f8f9ff]/50")}>
                  <td className="px-4 py-4 text-[14px] font-medium">{row.feature}</td>
                  <td className="px-4 py-4 text-center"><Cell value={row.wa} /></td>
                  <td className="px-4 py-4 text-center"><Cell value={row.wati} /></td>
                  <td className="px-4 py-4 text-center"><Cell value={row.aisensy} /></td>
                  <td className="bg-accent/5 px-4 py-4 text-center"><Cell value={row.growvisi} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollReveal>
      </div>
    </section>
  );
}
