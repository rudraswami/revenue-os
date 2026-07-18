"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { HOME_META_COMPARE } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check className="mx-auto h-5 w-5 text-accent" strokeWidth={2.5} />;
  if (value === false)
    return <X className="mx-auto h-5 w-5 text-muted-foreground/30" strokeWidth={2} />;
  return <span className="text-xs font-medium text-muted-foreground">{value}</span>;
}

export function MetaVsGrowvisi() {
  return (
    <section id="meta-compare" className="scroll-mt-20 border-t border-border bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[900px] px-6 lg:px-8">
        <SectionHeader
          label={HOME_META_COMPARE.label}
          title={HOME_META_COMPARE.title}
          subtitle={HOME_META_COMPARE.subtitle}
        />

        <div className="mt-12 overflow-hidden rounded-3xl border border-border shadow-[0_16px_48px_rgb(11_28_48/0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border bg-[#f8f9ff]">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-muted-foreground" />
                  <th className="px-4 py-4 text-center text-sm font-semibold">
                    {HOME_META_COMPARE.metaTitle}
                  </th>
                  <th className="bg-accent/[0.06] px-4 py-4 text-center text-sm font-bold text-accent">
                    {HOME_META_COMPARE.growvisiTitle}
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOME_META_COMPARE.rows.map((row) => (
                  <tr key={row.topic} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-4 text-[14px] font-medium">{row.topic}</td>
                    <td className="px-4 py-4 text-center">
                      <Cell value={row.meta} />
                    </td>
                    <td className={cn("bg-accent/[0.03] px-4 py-4 text-center")}>
                      <Cell value={row.growvisi} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Use both: Meta for in-chat FAQ if you want. Growvisi for team inbox, YOUR TURN, and pipeline ₹.{" "}
          <Link href="/demo" className="font-semibold text-accent hover:underline">
            See the workspace
            <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
