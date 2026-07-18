/**
 * Marketing header IA — founder-curated dropdowns.
 */

import { PRODUCT_PAGES, type ProductPageSlug } from "./product-pages";
import { SOLUTION_PAGES, type SolutionPageSlug } from "./solution-pages";
import type { MarketingIconName } from "./marketing-icons";

export type NavLinkItem = {
  href: string;
  label: string;
  description: string;
  icon: MarketingIconName;
  external?: boolean;
  /** Product preview slug for mega menu hover panel */
  productSlug?: ProductPageSlug;
  /** Solution preview slug for mega menu hover panel */
  solutionSlug?: SolutionPageSlug;
};

export type NavDropdown = {
  id: string;
  label: string;
  items: NavLinkItem[];
  featured?: { href: string; label: string; description: string };
  /** Wider panel with live preview (product / solutions menus) */
  variant?: "default" | "product" | "solution";
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

const solutionNavItems: NavLinkItem[] = (
  ["real-estate", "education", "healthcare", "d2c"] as SolutionPageSlug[]
).map((slug) => {
  const s = SOLUTION_PAGES[slug];
  return {
    href: `/solutions/${slug}`,
    label: s.navLabel,
    description: s.navDescription,
    icon: s.icon,
    solutionSlug: slug,
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
          icon: "plug-zap",
        },
        {
          href: "/product/intelligence",
          label: "AI classifies inbound",
          description: "Every message scored and staged",
          icon: "brain-circuit",
        },
        {
          href: "/product/conversations",
          label: "Take over & reply",
          description: "Human handoff → assign → Inbox reply",
          icon: "hand-helping",
        },
        {
          href: "/product/pipeline",
          label: "Close in pipeline",
          description: "Move to Won · track revenue ₹",
          icon: "indian-rupee",
        },
      ],
    },
  },
  {
    type: "dropdown",
    dropdown: {
      id: "solutions",
      label: "Solutions",
      variant: "solution",
      items: [
        ...solutionNavItems,
        {
          href: "/agencies",
          label: "Agencies & multi-location",
          description: "Operator plan · Agency hub for client workspaces",
          icon: "network",
        },
      ],
      featured: {
        href: "/#industries",
        label: "See all industries on homepage",
        description: "Real estate, education, healthcare, D2C & more",
      },
    },
  },
  { type: "link", href: "/pricing", label: "Pricing" },
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
