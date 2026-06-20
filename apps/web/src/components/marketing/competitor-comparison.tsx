import { Check, Minus } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { cn } from "@/lib/utils";

type Cell = boolean | "limited";

const rows: { capability: string; wa: Cell; wati: Cell; aisensy: Cell; growvisi: Cell }[] = [
  { capability: "Shared Inbox", wa: false, wati: true, aisensy: true, growvisi: true },
  { capability: "Pipeline CRM", wa: false, wati: "limited", aisensy: "limited", growvisi: true },
  { capability: "AI Intent Detection", wa: false, wati: false, aisensy: false, growvisi: true },
  { capability: "Lead Scoring", wa: false, wati: false, aisensy: false, growvisi: true },
  { capability: "Revenue Analytics", wa: false, wati: false, aisensy: false, growvisi: true },
  { capability: "Auto Stage Updates", wa: false, wati: false, aisensy: false, growvisi: true },
];

function CellIcon({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "limited") {
    return <span className="text-[12px] font-medium text-muted-foreground">Limited</span>;
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Minus className="h-4 w-4" />
    </span>
  );
}

export function CompetitorComparison() {
  return (
    <section id="compare" className="scroll-mt-20 surface-muted py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">Why Growvisi</p>
          <h2 className="display-lg mt-3 text-foreground">Why Growvisi Is Different</h2>
          <p className="body-lg mx-auto mt-4 max-w-[520px]">
            Inbox tools capture messages. Growvisi turns them into qualified pipeline and revenue.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.08} className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-4 text-left text-[13px] font-semibold text-muted-foreground">
                  Capability
                </th>
                <th className="px-4 py-4 text-center text-[13px] font-semibold">WhatsApp Business</th>
                <th className="px-4 py-4 text-center text-[13px] font-semibold">Wati</th>
                <th className="px-4 py-4 text-center text-[13px] font-semibold">AiSensy</th>
                <th className="px-5 py-4 text-center text-[13px] font-bold text-primary">Growvisi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.capability}
                  className={cn("border-b border-border/60", i % 2 === 0 && "bg-white")}
                >
                  <td className="px-5 py-4 text-[14px] font-medium">{row.capability}</td>
                  <td className="px-4 py-4 text-center">
                    <CellIcon value={row.wa} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <CellIcon value={row.wati} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <CellIcon value={row.aisensy} />
                  </td>
                  <td className="bg-primary-soft/30 px-5 py-4 text-center">
                    <CellIcon value={row.growvisi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollReveal>
      </div>
    </section>
  );
}
