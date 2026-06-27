/**
 * Marketing header IA — founder-curated dropdowns.
 */

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  GraduationCap,
  HeartPulse,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { PRODUCT_PAGES, type ProductPageSlug } from "./product-pages";

export type NavLinkItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
  /** Product preview slug for mega menu hover panel */
  productSlug?: ProductPageSlug;
};

export type NavDropdown = {
  id: string;
  label: string;
  items: NavLinkItem[];
  featured?: { href: string; label: string; description: string };
  /** Wider panel with live preview (product menu) */
  variant?: "default" | "product";
};

export type NavEntry =
  | { type: "link"; href: string; label: string; external?: boolean }
  | { type: "dropdown"; dropdown: NavDropdown };

const productNavItems: NavLinkItem[] = (
  ["conversations", "intelligence", "pipeline", "analytics", "automations"] as ProductPageSlug[]
).map((slug) => {
  const p = PRODUCT_PAGES[slug];
  return {
    href: `/product/${slug}`,
    label: p.navLabel,
    description: p.navDescription,
    icon: p.icon,
    productSlug: slug,
  };
});

export const MARKETING_NAV: NavEntry[] = [
  {
    type: "dropdown",
    dropdown: {
      id: "product",
      label: "Product",
      variant: "product",
      items: productNavItems,
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
          href: "/product/intelligence",
          label: "AI classifies inbound",
          description: "Every message scored and staged",
          icon: Sparkles,
        },
        {
          href: "/product/conversations",
          label: "Take over & reply",
          description: "Human handoff → assign → Inbox reply",
          icon: Users,
        },
        {
          href: "/product/pipeline",
          label: "Close in pipeline",
          description: "Move to Won · track revenue ₹",
          icon: MessageSquare,
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
        },
      ],
    },
  },
  { type: "link", href: "/#pricing", label: "Pricing" },
  { type: "link", href: "/agencies", label: "Agencies", external: true },
];

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
