/**
 * Product landing pages — founder IA for shipped modules.
 */

import type { LucideIcon } from "lucide-react";
import { BarChart3, Inbox, Kanban, Sparkles, Zap } from "lucide-react";

export type ProductPageSlug =
  | "conversations"
  | "intelligence"
  | "pipeline"
  | "analytics"
  | "automations";

export type ProductPageData = {
  slug: ProductPageSlug;
  navLabel: string;
  navDescription: string;
  icon: LucideIcon;
  eyebrow: string;
  headline: string;
  subhead: string;
  accent: string;
  features: Array<{ title: string; body: string }>;
  proofLine: string;
};

export const PRODUCT_PAGES: Record<ProductPageSlug, ProductPageData> = {
  conversations: {
    slug: "conversations",
    navLabel: "Conversations",
    navDescription: "Shared inbox · human reply from Growvisi",
    icon: Inbox,
    eyebrow: "Conversations",
    headline: "One inbox for your whole WhatsApp sales team",
    subhead:
      "Every customer thread in one place. AI classifies inbound messages — your team sends human replies from Growvisi when customers need a person.",
    accent: "from-[#ecfdf5] to-[#f8f9ff]",
    features: [
      { title: "Shared threads", body: "No more leads trapped on personal phones — full history for every rep." },
      { title: "Human reply", body: "Send from Inbox within the WhatsApp service window. Not an AI bot." },
      { title: "Handoff filter", body: "See threads flagged “needs human” and Take over in one click." },
      { title: "Assign & tasks", body: "Route deals to the right rep with ownership on the pipeline." },
    ],
    proofLine: "Built for teams that close on WhatsApp — not broadcast-only tools.",
  },
  intelligence: {
    slug: "intelligence",
    navLabel: "AI classification",
    navDescription: "Intent, score, and handoff on every thread",
    icon: Sparkles,
    eyebrow: "Intelligence",
    headline: "Every WhatsApp message classified before your team opens it",
    subhead:
      "Growvisi AI reads intent, urgency, and suggested pipeline stage on every inbound — and flags when a human should step in. Never auto-sends to customers.",
    accent: "from-[#e5eeff] to-[#f8f9ff]",
    features: [
      { title: "Intent & score", body: "Hot leads surface first — reps focus on buyers ready to close." },
      { title: "Suggested stage", body: "Pipeline updates from conversation context; drag when you need to override." },
      { title: "Handoff flag", body: "Complex or high-intent threads marked for your team, not a chatbot." },
      { title: "Reply drafts", body: "Optional human takeover suggestions — your rep sends the message." },
    ],
    proofLine: "Classification runs on ingest — see results in Inbox within seconds.",
  },
  pipeline: {
    slug: "pipeline",
    navLabel: "Pipeline",
    navDescription: "Kanban in ₹ — drag deals, track won/lost",
    icon: Kanban,
    eyebrow: "Pipeline",
    headline: "Your WhatsApp revenue board in ₹",
    subhead:
      "Drag deals from New to Won. Deal values power Home revenue pulse and Analytics — the pipeline your Meta inbox never gave you.",
    accent: "from-[#e8f0ff] to-[#f8f9ff]",
    features: [
      { title: "Kanban stages", body: "Customizable columns that match how your team actually sells." },
      { title: "Deal ₹ values", body: "Attach revenue to every card — see pipeline and won totals at a glance." },
      { title: "AI stage sync", body: "Classification suggests stage; your team confirms with a drag." },
      { title: "Won / lost", body: "Capture why deals close — feed won/lost analytics on Growth+." },
    ],
    proofLine: "Same engine for solo sellers and 12-agent teams.",
  },
  analytics: {
    slug: "analytics",
    navLabel: "Revenue analytics",
    navDescription: "Funnel, attribution, Razorpay → Won",
    icon: BarChart3,
    eyebrow: "Analytics",
    headline: "See conversion and pipeline ₹ — not just message counts",
    subhead:
      "Funnel by stage, team workload, campaign attribution, and Razorpay payment → Won automation. Revenue metrics tied to WhatsApp, not spreadsheets.",
    accent: "from-[#f0fdf4] to-[#f8f9ff]",
    features: [
      { title: "Revenue funnel", body: "30-day conversion and stage breakdown from live pipeline data." },
      { title: "Click-to-WA attribution", body: "Track which campaigns and links produce qualified leads." },
      { title: "Razorpay → Won", body: "Mark deals won when payment lands — Growth plan and above." },
      { title: "Team workload", body: "Who owns how many open deals — balance the floor fairly." },
    ],
    proofLine: "Honest metrics from your workspace — no vanity dashboard widgets.",
  },
  automations: {
    slug: "automations",
    navLabel: "Automations & digest",
    navDescription: "Morning brief on email or WhatsApp (Hindi)",
    icon: Zap,
    eyebrow: "Automations",
    headline: "Owners wake up to pipeline ₹ — on email or WhatsApp",
    subhead:
      "Morning digest with hot leads, handoffs, and unread counts. Hindi digest body supported — owner alerts only, not customer auto-reply.",
    accent: "from-[#fff7ed] to-[#f8f9ff]",
    features: [
      { title: "Morning digest", body: "Scheduled IST brief — pipeline ₹, won last 24h, handoffs waiting." },
      { title: "WhatsApp digest", body: "Send the brief to owner WhatsApp with optional Meta template." },
      { title: "Hindi locale", body: "Digest body in Hindi for owner alerts across India." },
      { title: "Honest automations", body: "No fake welcome toggles — your team and optional Meta BA handle chat." },
    ],
    proofLine: "Alerts that drive action — open Inbox, Take over, move pipeline.",
  },
};

export const PRODUCT_SLUGS = Object.keys(PRODUCT_PAGES) as ProductPageSlug[];

export function getProductPage(slug: string): ProductPageData | null {
  return slug in PRODUCT_PAGES ? PRODUCT_PAGES[slug as ProductPageSlug] : null;
}
