/**
 * Marketing header IA — founder-curated dropdowns.
 * Rule: every link maps to shipped product or homepage anchor. No vaporware.
 */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  GraduationCap,
  HeartPulse,
  Inbox,
  Kanban,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export type NavLinkItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
};

export type NavDropdown = {
  id: string;
  label: string;
  items: NavLinkItem[];
  /** Optional featured card in panel footer */
  featured?: { href: string; label: string; description: string };
};

export type NavEntry =
  | { type: "link"; href: string; label: string; external?: boolean }
  | { type: "dropdown"; dropdown: NavDropdown };

export const MARKETING_NAV: NavEntry[] = [
  {
    type: "dropdown",
    dropdown: {
      id: "product",
      label: "Product",
      items: [
        {
          href: "/#product",
          label: "Conversations",
          description: "Shared inbox · human reply from Growvisi",
          icon: Inbox,
        },
        {
          href: "/#engine",
          label: "AI classification",
          description: "Intent, score, and handoff flags on every thread",
          icon: Sparkles,
        },
        {
          href: "/#product",
          label: "Pipeline",
          description: "Kanban in ₹ — drag deals, track won/lost",
          icon: Kanban,
        },
        {
          href: "/#compare",
          label: "Revenue analytics",
          description: "Funnel, attribution, Razorpay → Won",
          icon: BarChart3,
        },
        {
          href: "/#pricing",
          label: "Automations & digest",
          description: "Morning brief on email or WhatsApp (Hindi)",
          icon: Zap,
        },
      ],
      featured: {
        href: "/register",
        label: "Start 14-day trial",
        description: "500 leads · 1 WhatsApp number · no card",
      },
    },
  },
  {
    type: "dropdown",
    dropdown: {
      id: "how-it-works",
      label: "How it works",
      items: [
        {
          href: "/#engine",
          label: "Connect WhatsApp",
          description: "Meta Cloud API · ~15 min setup",
          icon: MessageSquare,
        },
        {
          href: "/#engine",
          label: "AI classifies inbound",
          description: "Every message scored and staged",
          icon: Sparkles,
        },
        {
          href: "/#engine",
          label: "Take over & reply",
          description: "Human handoff → assign → Inbox reply",
          icon: Users,
        },
        {
          href: "/#engine",
          label: "Close in pipeline",
          description: "Move to Won · track revenue ₹",
          icon: Kanban,
        },
      ],
    },
  },
  {
    type: "dropdown",
    dropdown: {
      id: "solutions",
      label: "Solutions",
      items: [
        {
          href: "/#industries",
          label: "Real estate",
          description: "Plot visits & site-tour leads from WA",
          icon: Building2,
        },
        {
          href: "/#industries",
          label: "Education",
          description: "Admission leads scored by intent",
          icon: GraduationCap,
        },
        {
          href: "/#industries",
          label: "Healthcare",
          description: "Appointment requests prioritized",
          icon: HeartPulse,
        },
        {
          href: "/#industries",
          label: "D2C & retail",
          description: "Campaign click-to-WA → won orders",
          icon: ShoppingBag,
        },
        {
          href: "/agencies",
          label: "Agencies & partners",
          description: "Multi-client hub · Operator plan",
          icon: Users,
          external: true,
        },
      ],
    },
  },
  { type: "link", href: "/#pricing", label: "Pricing" },
  { type: "link", href: "/agencies", label: "Agencies", external: true },
];

/** Metrics we commit to measure in a pilot — not marketing claims until filled */
export const PILOT_METRICS_TEMPLATE = [
  {
    key: "win_rate",
    label: "Win rate",
    before: "—",
    after: "—",
    note: "Won deals ÷ qualified leads (30-day window)",
  },
  {
    key: "first_response",
    label: "Median first response",
    before: "—",
    after: "—",
    note: "Time to first human reply after inbound",
  },
  {
    key: "pipeline_inr",
    label: "Pipeline ₹ visible",
    before: "—",
    after: "—",
    note: "Deals with ₹ value on Pipeline board",
  },
  {
    key: "handoff_sla",
    label: "Handoff resolution",
    before: "—",
    after: "—",
    note: "% flagged threads with Take over within 24h",
  },
] as const;
