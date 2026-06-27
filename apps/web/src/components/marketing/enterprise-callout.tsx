"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { ENTERPRISE_OFFERING } from "@/lib/gtm-copy";

/** Honest Enterprise callout — only what we can deliver today + standard contract items */
export function EnterpriseCallout() {
  return (
    <div className="mt-10 rounded-3xl border border-[#dce9ff] bg-gradient-to-br from-[#0b1c30] to-[#132a45] p-6 text-white md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#6cf8bb]">
            <Building2 className="h-3.5 w-3.5" />
            Enterprise
          </span>
          <h3 className="mt-4 text-xl font-bold md:text-2xl">{ENTERPRISE_OFFERING.tagline}</h3>
          <p className="mt-2 text-sm text-white/70">{ENTERPRISE_OFFERING.forWho}</p>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#6cf8bb] px-5 py-2.5 text-sm font-semibold text-[#0b1c30] hover:bg-[#5ae8ab]"
        >
          Contact sales
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6cf8bb]">What you get</p>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            {ENTERPRISE_OFFERING.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[#6cf8bb]">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6cf8bb]">Talk to us if</p>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            {ENTERPRISE_OFFERING.contactReasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-white/40">·</span>
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-white/50">
            Built on the same Operator stack — agency hub, API, webhooks, Hindi digest, audit log, and
            partner install kit. Enterprise adds custom limits and rollout support.
          </p>
        </div>
      </div>
    </div>
  );
}
