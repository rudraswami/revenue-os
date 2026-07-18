"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import {
  computeLeakage,
  formatInr,
  type LeakageInputs,
  type RecoveryScenario,
  type TeamBand,
} from "@/lib/revenue-leakage-model";
import { cn } from "@/lib/utils";

const SCENARIOS: { id: RecoveryScenario; label: string }[] = [
  { id: "conservative", label: "Conservative" },
  { id: "likely", label: "Likely" },
  { id: "optimistic", label: "Optimistic" },
];

const TEAM_BANDS: { id: TeamBand; label: string; hint: string }[] = [
  { id: "solo", label: "1–2 people", hint: "Owner + helper" },
  { id: "team", label: "3–5 people", hint: "Small sales team" },
  { id: "operator", label: "6+ / agency", hint: "Multi-client hub" },
];

function LeakageSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="leakage-slider">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-accent">{format(value)}</p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="leakage-range mt-3 w-full"
        style={{ "--range-pct": `${pct}%` } as CSSProperties}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}

/** WhatsApp revenue leakage — plan-aware, tied to handoff + follow-up gaps */
export function RoiCalculator({ className }: { className?: string }) {
  const [inputs, setInputs] = useState<LeakageInputs>({
    leadsPerMonth: 180,
    needHumanPct: 42,
    goColdPct: 28,
    avgDealInr: 28_000,
    teamBand: "team",
    scenario: "likely",
  });

  const result = useMemo(() => computeLeakage(inputs), [inputs]);

  const patch = (partial: Partial<LeakageInputs>) =>
    setInputs((prev) => ({ ...prev, ...partial }));

  return (
    <div
      className={cn(
        "leakage-calc overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#f8f9ff] to-white",
        className,
      )}
    >
      <div className="border-b border-border/80 px-6 py-5 md:px-8 md:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bento-mint">
              <TrendingDown className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">WhatsApp revenue leakage</h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Leads that need a human but go cold in 24h — estimate what slips through before
                you compare plans.
              </p>
            </div>
          </div>
          <div className="flex rounded-xl border border-border bg-white p-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => patch({ scenario: s.id })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  inputs.scenario === s.id
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 px-6 py-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:px-8 md:py-7">
        <div className="space-y-6">
          <LeakageSlider
            label="Inbound WhatsApp leads / month"
            value={inputs.leadsPerMonth}
            min={50}
            max={4_000}
            step={10}
            format={(n) => n.toLocaleString("en-IN")}
            onChange={(leadsPerMonth) => patch({ leadsPerMonth })}
          />
          <LeakageSlider
            label="Need a human follow-up"
            hint="Quotes, visits, pricing — not FAQ"
            value={inputs.needHumanPct}
            min={15}
            max={75}
            step={1}
            format={(n) => `${n}%`}
            onChange={(needHumanPct) => patch({ needHumanPct })}
          />
          <LeakageSlider
            label="Go cold without reply in 24h"
            hint="Today — no clear owner in Inbox"
            value={inputs.goColdPct}
            min={8}
            max={55}
            step={1}
            format={(n) => `${n}%`}
            onChange={(goColdPct) => patch({ goColdPct })}
          />
          <LeakageSlider
            label="Average deal size"
            value={inputs.avgDealInr}
            min={3_000}
            max={500_000}
            step={1_000}
            format={formatInr}
            onChange={(avgDealInr) => patch({ avgDealInr })}
          />

          <div>
            <p className="text-sm font-medium text-foreground">Team size</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Picks the plan we compare against
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {TEAM_BANDS.map((band) => (
                <button
                  key={band.id}
                  type="button"
                  onClick={() => patch({ teamBand: band.id })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    inputs.teamBand === band.id
                      ? "border-accent/40 bg-bento-mint/40"
                      : "border-border bg-white hover:border-accent/20",
                  )}
                >
                  <p className="text-sm font-semibold">{band.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{band.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/70">
              Est. lost / month
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-950">
              {formatInr(result.lostRevenue)}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-900/65">
              ~{result.atRiskLeads} leads at risk · assumes 12% would convert with timely follow-up
            </p>
          </div>

          <div className="rounded-2xl border border-accent/25 bg-bento-mint/35 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Recoverable with Growvisi
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-accent">
              {formatInr(result.recoverable)}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {Math.round(result.recoveryRate * 100)}% recovery · YOUR TURN + pipeline ownership
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested plan
            </p>
            <p className="mt-1 text-xl font-bold">
              {result.planName}{" "}
              <span className="text-base font-semibold text-muted-foreground">
                · {formatInr(result.planCost)}/mo
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ≈ ₹{result.planPerDay.toLocaleString("en-IN")}/day
              {result.paybackDays != null ? (
                <>
                  {" "}
                  · one recovered deal pays back in ~{result.paybackDays} days
                </>
              ) : null}
            </p>
            <p className="mt-2 text-lg font-bold text-foreground">
              {result.roi.toFixed(1)}× vs plan cost
            </p>
          </div>

          <Button asChild className="mt-auto h-11 w-full">
            <Link href="/register">
              {CTA.startTrial}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <p className="border-t border-border/80 px-6 py-4 text-[11px] leading-relaxed text-muted-foreground md:px-8">
        Illustrative model — not a guarantee. Assumes better assignment and follow-up via Inbox; track
        win rate and pipeline ₹ in your 30-day pilot.{" "}
        <Link href="/#case-study" className="font-semibold text-accent hover:underline">
          See pilot rollout →
        </Link>
      </p>
    </div>
  );
}
