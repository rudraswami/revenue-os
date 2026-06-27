"use client";

import { useMemo, useState } from "react";
import { IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Simple founder ROI model — customer fills assumptions */
export function RoiCalculator() {
  const [leadsPerMonth, setLeadsPerMonth] = useState(200);
  const [winRatePct, setWinRatePct] = useState(12);
  const [avgDealInr, setAvgDealInr] = useState(25000);
  const [upliftPct, setUpliftPct] = useState(15);

  const result = useMemo(() => {
    const leads = Math.max(0, leadsPerMonth);
    const winRate = Math.min(100, Math.max(0, winRatePct)) / 100;
    const deal = Math.max(0, avgDealInr);
    const uplift = Math.min(50, Math.max(0, upliftPct)) / 100;

    const baselineRevenue = leads * winRate * deal;
    const incrementalRevenue = baselineRevenue * uplift;
    const growvisiCost = 2999;
    const roi = growvisiCost > 0 ? incrementalRevenue / growvisiCost : 0;

    return { baselineRevenue, incrementalRevenue, roi };
  }, [leadsPerMonth, winRatePct, avgDealInr, upliftPct]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="rounded-3xl border border-[#dce9ff] bg-gradient-to-br from-[#f8f9ff] to-white p-6 md:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bento-mint">
          <IndianRupee className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Revenue impact calculator</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimate incremental ₹ from better follow-up and pipeline visibility — use your own
            numbers.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted-foreground">WhatsApp leads / month</span>
          <Input
            type="number"
            min={0}
            value={leadsPerMonth}
            onChange={(e) => setLeadsPerMonth(Number(e.target.value) || 0)}
            className="h-10 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted-foreground">Win rate today (%)</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={winRatePct}
            onChange={(e) => setWinRatePct(Number(e.target.value) || 0)}
            className="h-10 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted-foreground">Avg deal size (₹)</span>
          <Input
            type="number"
            min={0}
            value={avgDealInr}
            onChange={(e) => setAvgDealInr(Number(e.target.value) || 0)}
            className="h-10 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted-foreground">Uplift from Growvisi (%)</span>
          <Input
            type="number"
            min={0}
            max={50}
            value={upliftPct}
            onChange={(e) => setUpliftPct(Number(e.target.value) || 0)}
            className="h-10 rounded-xl"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">Baseline monthly revenue</p>
          <p className="text-xl font-bold">{fmt(result.baselineRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-accent/20 bg-bento-mint/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Est. incremental / month</p>
          <p className="text-xl font-bold text-accent">{fmt(result.incrementalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">vs Team plan (₹2,999/mo)</p>
          <p className="text-xl font-bold">{result.roi.toFixed(1)}×</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Illustrative model only — not a guarantee. Pilot customers should track win rate and pipeline
        ₹ before and after 30 days.
      </p>
    </div>
  );
}
