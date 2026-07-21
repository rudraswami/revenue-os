"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  MessageCircleReply,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Megaphone,
    title: "Template broadcasts",
    body: "Reach CRM segments with Meta-approved WhatsApp templates.",
  },
  {
    icon: BarChart3,
    title: "Delivery funnel",
    body: "Sent → delivered → read → replied — live progress while sending.",
  },
  {
    icon: MessageCircleReply,
    title: "Reply attribution",
    body: "Campaign replies surface in Inbox with a direct link back.",
  },
  {
    icon: ShieldCheck,
    title: "STOP compliance",
    body: "Opt-outs are skipped automatically — honest India-first ops.",
  },
  {
    icon: CalendarClock,
    title: "IST scheduling",
    body: "Schedule sends in India Standard Time from the dashboard.",
  },
  {
    icon: Sparkles,
    title: "Pipeline loop",
    body: "Replies become conversations your team closes from Inbox.",
  },
] as const;

export function CampaignsPlanGate({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-bento-mint via-card to-viz-violet/10 elev-1",
        className,
      )}
    >
      <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:p-8 lg:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Growth feature
          </p>
          <h2 className="mt-2 font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            WhatsApp campaigns that feed your pipeline
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Broadcast to segments, track delivery and replies, and follow up from Inbox — human
            replies only, no chatbot bait.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href="/dashboard/pricing">Upgrade to Growth — ₹2,999/mo</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl bg-card/80">
              <Link href="/dashboard/inbox">Open Conversations</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            14-day trial on Starter · Campaigns unlock on Growth or Pro
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-2xl border border-white/60 bg-card/70 p-4 backdrop-blur-sm"
            >
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-bento-mint text-accent">
                <f.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
