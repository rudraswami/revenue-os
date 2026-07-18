"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavDropdown, NavLinkItem } from "@/lib/marketing-nav";
import { PRODUCT_PAGES, type ProductPageSlug } from "@/lib/product-pages";
import { SOLUTION_PAGES, type SolutionPageSlug } from "@/lib/solution-pages";

const PANEL_MOTION = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
  transition: { duration: 0.16, ease: "easeOut" as const },
};

const PRODUCT_ACCENTS: Record<ProductPageSlug, string> = {
  conversations: "#006c49",
  intelligence: "#1d4ed8",
  pipeline: "#4f46e5",
  analytics: "#047857",
  automations: "#c2410c",
};

const WORKFLOW_STEPS = ["01", "02", "03", "04"];

type MenuSkin = {
  listBg: string;
  panelBg: string;
  featuredBg: string;
  featuredCta: string;
};

function menuSkin(variant: NavDropdown["variant"]): MenuSkin {
  switch (variant) {
    case "product":
      return {
        listBg: "bg-gradient-to-b from-[#f0fdf7] to-white",
        panelBg: "bg-gradient-to-br from-[#ecfdf5] via-white to-[#e5eeff]",
        featuredBg: "bg-gradient-to-r from-[#ecfdf5] to-[#e5eeff]",
        featuredCta:
          "inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-hover",
      };
    case "solution":
      return {
        listBg: "bg-gradient-to-b from-[#f8f9ff] to-white",
        panelBg: "bg-[#0b1c30]",
        featuredBg: "bg-[#f8f9ff]",
        featuredCta:
          "inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent hover:underline",
      };
    case "workflow":
      return {
        listBg: "bg-white",
        panelBg: "bg-[#0b1c30]",
        featuredBg: "bg-[#0b1c30]",
        featuredCta:
          "inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#6cf8bb]/40 bg-[#6cf8bb]/10 px-3 py-1.5 text-[12px] font-semibold text-[#6cf8bb] hover:bg-[#6cf8bb]/20",
      };
    default:
      return {
        listBg: "bg-white",
        panelBg: "bg-[#fafbff]",
        featuredBg: "bg-[#f8f9ff]",
        featuredCta:
          "inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent hover:underline",
      };
  }
}

function NavItemLink({
  item,
  active,
  stepIndex,
  accentColor,
  onHover,
  onClose,
}: {
  item: NavLinkItem;
  active?: boolean;
  stepIndex?: number;
  accentColor?: string;
  onHover?: () => void;
  onClose: () => void;
}) {
  const accent = accentColor ?? "#006c49";

  const className = cn(
    "group relative block px-4 py-3 transition-all duration-200",
    active ? "bg-white/80 shadow-sm" : "hover:bg-white/60",
  );

  const inner = (
    <>
      {active ? (
        <span
          className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      ) : null}
      <p className="flex items-center gap-2.5 text-[13px] font-semibold leading-tight text-foreground">
        {stepIndex !== undefined ? (
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
              active ? "text-white" : "bg-[#e5eeff] text-accent",
            )}
            style={active ? { backgroundColor: accent } : undefined}
          >
            {WORKFLOW_STEPS[stepIndex] ?? String(stepIndex + 1).padStart(2, "0")}
          </span>
        ) : accentColor ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: active ? accent : `${accent}55` }}
            aria-hidden
          />
        ) : null}
        <span className="flex-1">{item.label}</span>
        <ArrowRight
          className={cn(
            "h-3 w-3 shrink-0 transition-all duration-200",
            active ? "translate-x-0 opacity-80" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60",
          )}
          style={{ color: accent }}
        />
      </p>
      <p className={cn("mt-1 text-[12px] leading-relaxed text-muted-foreground", stepIndex !== undefined && "pl-8")}>
        {item.description}
      </p>
    </>
  );

  const isInternal = item.href.startsWith("/") && !item.external;

  if (isInternal) {
    return (
      <Link href={item.href} className={className} onMouseEnter={onHover} onClick={onClose}>
        {inner}
      </Link>
    );
  }

  if (item.external) {
    return (
      <Link href={item.href} className={className} onMouseEnter={onHover} onClick={onClose}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={item.href} className={className} onMouseEnter={onHover} onClick={onClose}>
      {inner}
    </a>
  );
}

function ProductDetailPanel({ slug, onClose }: { slug: ProductPageSlug; onClose: () => void }) {
  const product = PRODUCT_PAGES[slug];
  const accent = PRODUCT_ACCENTS[slug];
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="relative">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: accent }}
        >
          {product.eyebrow}
        </span>
        <h3 className="mt-3 text-[15px] font-bold leading-snug text-foreground">{product.headline}</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{product.subhead}</p>
        <ul className="mt-4 space-y-2">
          {product.features.slice(0, 3).map((f) => (
            <li key={f.title} className="flex gap-2 text-[12px] leading-snug">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span>
                <span className="font-semibold text-foreground">{f.title}</span>
                <span className="text-muted-foreground"> — {f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/product/${product.slug}`}
        className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-semibold hover:underline"
        style={{ color: accent }}
        onClick={onClose}
      >
        Explore {product.navLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function SolutionDetailPanel({
  slug,
  onClose,
  agencies,
}: {
  slug?: SolutionPageSlug;
  agencies?: boolean;
  onClose: () => void;
}) {
  if (agencies) {
    return (
      <div className="relative flex h-full flex-col justify-between p-5 text-white">
        <div className="pointer-events-none absolute -right-6 top-0 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl" aria-hidden />
        <div>
          <span className="inline-flex rounded-full bg-violet-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">
            Agencies
          </span>
          <h3 className="mt-3 text-[15px] font-bold leading-snug">One hub for every client workspace</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-white/65">
            Operator plan for agencies managing 15+ WhatsApp sales accounts — separate pipelines, shared playbooks.
          </p>
          <ul className="mt-4 space-y-2 text-[12px] text-white/70">
            <li className="flex gap-2">
              <span className="text-violet-300">—</span> Agency hub & client workspaces
            </li>
            <li className="flex gap-2">
              <span className="text-violet-300">—</span> Per-client pipeline ₹ rollups
            </li>
            <li className="flex gap-2">
              <span className="text-violet-300">—</span> Enterprise limits & SLA
            </li>
          </ul>
        </div>
        <Link
          href="/agencies"
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-violet-300 hover:underline"
          onClick={onClose}
        >
          Explore agency plan
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  if (!slug) return null;
  const solution = SOLUTION_PAGES[slug];
  return (
    <div className="relative flex h-full flex-col justify-between p-5 text-white">
      <div
        className="pointer-events-none absolute -right-6 top-0 h-28 w-28 rounded-full blur-2xl"
        style={{ backgroundColor: `${solution.accentColor}40` }}
        aria-hidden
      />
      <div>
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${solution.accentColor}30`, color: solution.accentColor }}
        >
          {solution.navLabel}
        </span>
        <h3 className="mt-3 text-[15px] font-bold leading-snug">{solution.headline}</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-white/65 line-clamp-2">{solution.subhead}</p>
        <ul className="mt-4 space-y-2">
          {solution.outcomes.slice(0, 3).map((point) => (
            <li key={point} className="flex gap-2 text-[12px] leading-snug text-white/70">
              <span style={{ color: solution.accentColor }}>—</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/solutions/${solution.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold hover:underline"
        style={{ color: solution.accentColor }}
        onClick={onClose}
      >
        Explore {solution.navLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function WorkflowDetailPanel({ stepIndex, onClose }: { stepIndex: number; onClose: () => void }) {
  const steps = [
    { label: "WhatsApp in", sub: "Meta Cloud API" },
    { label: "AI classifies", sub: "Intent + score" },
    { label: "YOUR TURN", sub: "Human replies" },
    { label: "Pipeline ₹", sub: "Deal tracked" },
  ];
  const active = steps[stepIndex] ?? steps[0];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden p-5 text-white">
      <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#6cf8bb]/10 blur-3xl" aria-hidden />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6cf8bb]">The revenue engine</p>
        <h3 className="mt-2 text-[16px] font-bold leading-snug">{active.label}</h3>
        <p className="mt-1 text-[12px] text-white/55">{active.sub}</p>

        <div className="mt-6 flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-lg text-[9px] font-bold leading-tight",
                  i === stepIndex
                    ? "bg-[#6cf8bb] text-[#0b1c30]"
                    : i < stepIndex
                      ? "bg-[#6cf8bb]/25 text-[#6cf8bb]"
                      : "bg-white/8 text-white/40",
                )}
              >
                {s.label}
              </div>
              {i < steps.length - 1 ? (
                <span className="text-[10px] text-white/25" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-white/70">
          WhatsApp is the conversation. Growvisi is the deal — classify, assign YOUR TURN, track ₹.
        </p>
      </div>
      <Link
        href="/#engine"
        className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#6cf8bb] hover:underline"
        onClick={onClose}
      >
        See the full flow
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function itemAccent(item: NavLinkItem, variant: NavDropdown["variant"]): string | undefined {
  if (item.productSlug) return PRODUCT_ACCENTS[item.productSlug];
  if (item.solutionSlug) return SOLUTION_PAGES[item.solutionSlug].accentColor;
  if (variant === "solution" && item.href === "/agencies") return "#8b5cf6";
  return undefined;
}

export function NavMegaMenu({
  menu,
  open,
  onActivate,
  onScheduleClose,
  onCancelClose,
  onCloseNow,
}: {
  menu: NavDropdown;
  open: boolean;
  onActivate: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  onCloseNow: () => void;
}) {
  const firstProductSlug = menu.items.find((i) => i.productSlug)?.productSlug ?? null;
  const firstSolutionSlug = menu.items.find((i) => i.solutionSlug)?.solutionSlug ?? null;
  const [hoverProductSlug, setHoverProductSlug] = useState<ProductPageSlug | null>(firstProductSlug);
  const [hoverSolutionSlug, setHoverSolutionSlug] = useState<SolutionPageSlug | null>(firstSolutionSlug);
  const [hoverAgencies, setHoverAgencies] = useState(false);
  const [hoverWorkflowStep, setHoverWorkflowStep] = useState(0);

  const activate = () => {
    onCancelClose();
    onActivate();
  };

  const variant = menu.variant ?? "default";
  const skin = menuSkin(variant);
  const isProduct = variant === "product";
  const isSolution = variant === "solution";
  const isWorkflow = variant === "workflow";
  const hasDetailPanel = isProduct || isSolution || isWorkflow;
  const previewProductSlug = hoverProductSlug ?? firstProductSlug;
  const previewSolutionSlug = hoverSolutionSlug ?? firstSolutionSlug;

  const panelWidth = hasDetailPanel ? "w-[min(100vw-2rem,720px)]" : "w-[min(100vw-2rem,400px)]";

  return (
    <div className="relative" onMouseEnter={activate} onMouseLeave={onScheduleClose}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[14px] font-medium transition-colors duration-200",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? onCloseNow() : activate())}
        onMouseEnter={activate}
        onFocus={activate}
      >
        {menu.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 opacity-60 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className={cn("absolute left-1/2 top-full z-50 -translate-x-1/2", panelWidth)} onMouseEnter={onCancelClose}>
          <div className="h-2.5" aria-hidden />

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_24px_64px_rgb(11_28_48/0.14)]">
            {hasDetailPanel ? (
              <div className="grid lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                <div className={cn("divide-y divide-border/40 lg:border-r lg:border-border/40", skin.listBg)}>
                  {menu.items.map((item, index) => {
                    const accent = itemAccent(item, variant);
                    const active = isProduct
                      ? item.productSlug === previewProductSlug
                      : isSolution
                        ? item.href === "/agencies"
                          ? hoverAgencies
                          : item.solutionSlug === previewSolutionSlug && !hoverAgencies
                        : isWorkflow
                          ? hoverWorkflowStep === index
                          : false;

                    return (
                      <NavItemLink
                        key={item.href}
                        item={item}
                        active={active}
                        stepIndex={isWorkflow ? index : undefined}
                        accentColor={accent}
                        onHover={() => {
                          if (item.productSlug) setHoverProductSlug(item.productSlug);
                          if (item.solutionSlug) {
                            setHoverSolutionSlug(item.solutionSlug);
                            setHoverAgencies(false);
                          }
                          if (item.href === "/agencies") {
                            setHoverAgencies(true);
                          }
                          if (isWorkflow) setHoverWorkflowStep(index);
                        }}
                        onClose={onCloseNow}
                      />
                    );
                  })}
                </div>
                <div className={cn("relative hidden h-[308px] overflow-hidden lg:block", skin.panelBg)}>
                  <AnimatePresence mode="wait">
                    {isProduct && previewProductSlug ? (
                      <motion.div key={previewProductSlug} className="absolute inset-0" {...PANEL_MOTION}>
                        <ProductDetailPanel slug={previewProductSlug} onClose={onCloseNow} />
                      </motion.div>
                    ) : isSolution && hoverAgencies ? (
                      <motion.div key="agencies" className="absolute inset-0" {...PANEL_MOTION}>
                        <SolutionDetailPanel agencies onClose={onCloseNow} />
                      </motion.div>
                    ) : isSolution && previewSolutionSlug ? (
                      <motion.div key={previewSolutionSlug} className="absolute inset-0" {...PANEL_MOTION}>
                        <SolutionDetailPanel slug={previewSolutionSlug} onClose={onCloseNow} />
                      </motion.div>
                    ) : isWorkflow ? (
                      <motion.div key={hoverWorkflowStep} className="absolute inset-0" {...PANEL_MOTION}>
                        <WorkflowDetailPanel stepIndex={hoverWorkflowStep} onClose={onCloseNow} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className={cn("divide-y divide-border/40 py-0.5", skin.listBg)}>
                {menu.items.map((item, index) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    stepIndex={isWorkflow ? index : undefined}
                    accentColor={itemAccent(item, variant)}
                    onClose={onCloseNow}
                  />
                ))}
              </div>
            )}

            {menu.featured ? (
              <div
                className={cn(
                  "flex items-center justify-between gap-4 border-t border-border/60 px-4 py-3",
                  skin.featuredBg,
                  isWorkflow && "text-white",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] leading-snug",
                    isWorkflow ? "text-white/55" : "text-muted-foreground",
                  )}
                >
                  {menu.featured.description}
                </p>
                <Link href={menu.featured.href} className={skin.featuredCta} onClick={onCloseNow}>
                  {menu.featured.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
