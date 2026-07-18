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

function NavItemLink({
  item,
  active,
  onHover,
  onClose,
}: {
  item: NavLinkItem;
  active?: boolean;
  onHover?: () => void;
  onClose: () => void;
}) {
  const className = cn(
    "group block px-4 py-3 transition-colors duration-200",
    active ? "bg-[#f4fbf8]" : "hover:bg-[#fafbff]",
  );

  const inner = (
    <>
      <p className="flex items-center gap-2 text-[13px] font-semibold leading-tight text-foreground">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full bg-accent transition-opacity duration-200",
            active ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
        <span className="flex-1">{item.label}</span>
        <ArrowRight
          className={cn(
            "h-3 w-3 shrink-0 text-accent transition-all duration-200",
            active ? "translate-x-0 opacity-80" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60",
          )}
        />
      </p>
      <p className="mt-1 pl-3.5 text-[12px] leading-relaxed text-muted-foreground">{item.description}</p>
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
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{product.eyebrow}</p>
        <h3 className="mt-2 text-[15px] font-bold leading-snug text-foreground">{product.headline}</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{product.subhead}</p>
        <ul className="mt-4 space-y-2.5">
          {product.features.slice(0, 3).map((f) => (
            <li key={f.title} className="text-[12px] leading-snug">
              <span className="font-semibold text-foreground">{f.title}</span>
              <span className="text-muted-foreground"> — {f.body}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/product/${product.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
        onClick={onClose}
      >
        Explore {product.navLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function SolutionDetailPanel({ slug, onClose }: { slug: SolutionPageSlug; onClose: () => void }) {
  const solution = SOLUTION_PAGES[slug];
  return (
    <div
      className="flex h-full flex-col justify-between p-5"
      style={{ background: `linear-gradient(160deg, ${solution.accentColor}0c 0%, #fafbff 60%)` }}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: solution.accentColor }}>
          {solution.navLabel}
        </p>
        <h3 className="mt-2 text-[15px] font-bold leading-snug text-foreground">{solution.headline}</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{solution.subhead}</p>
        <ul className="mt-4 space-y-2.5">
          {solution.outcomes.slice(0, 3).map((point) => (
            <li key={point} className="text-[12px] leading-snug text-muted-foreground">
              {point}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/solutions/${solution.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
        onClick={onClose}
      >
        Explore {solution.navLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
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
  /** Hover/focus this menu — opens it immediately */
  onActivate: () => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
  onCloseNow: () => void;
}) {
  const firstProductSlug = menu.items.find((i) => i.productSlug)?.productSlug ?? null;
  const firstSolutionSlug = menu.items.find((i) => i.solutionSlug)?.solutionSlug ?? null;
  const [hoverProductSlug, setHoverProductSlug] = useState<ProductPageSlug | null>(firstProductSlug);
  const [hoverSolutionSlug, setHoverSolutionSlug] = useState<SolutionPageSlug | null>(firstSolutionSlug);

  const activate = () => {
    onCancelClose();
    onActivate();
  };

  const isProduct = menu.variant === "product";
  const isSolution = menu.variant === "solution";
  const hasDetailPanel = isProduct || isSolution;
  const previewProductSlug = hoverProductSlug ?? firstProductSlug;
  const previewSolutionSlug = hoverSolutionSlug ?? firstSolutionSlug;

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
        <div
          className={cn(
            "absolute left-1/2 top-full z-50 -translate-x-1/2",
            hasDetailPanel ? "w-[min(100vw-2rem,700px)]" : "w-[min(100vw-2rem,400px)]",
          )}
          onMouseEnter={onCancelClose}
        >
          <div className="h-2.5" aria-hidden />

          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_20px_50px_rgb(11_28_48/0.12)]">
            {hasDetailPanel ? (
              <div className="grid lg:grid-cols-[minmax(0,15.5rem)_minmax(0,1fr)]">
                <div className="divide-y divide-border/60 border-border/60 lg:border-r">
                  {menu.items.map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      active={
                        isProduct
                          ? item.productSlug === previewProductSlug
                          : isSolution
                            ? item.solutionSlug === previewSolutionSlug
                            : false
                      }
                      onHover={() => {
                        if (item.productSlug) setHoverProductSlug(item.productSlug);
                        if (item.solutionSlug) setHoverSolutionSlug(item.solutionSlug);
                      }}
                      onClose={onCloseNow}
                    />
                  ))}
                </div>
                <div className="relative hidden h-[300px] overflow-hidden bg-[#fafbff] lg:block">
                  <AnimatePresence mode="wait">
                    {isProduct && previewProductSlug ? (
                      <motion.div key={previewProductSlug} className="absolute inset-0" {...PANEL_MOTION}>
                        <ProductDetailPanel slug={previewProductSlug} onClose={onCloseNow} />
                      </motion.div>
                    ) : isSolution && previewSolutionSlug ? (
                      <motion.div key={previewSolutionSlug} className="absolute inset-0" {...PANEL_MOTION}>
                        <SolutionDetailPanel slug={previewSolutionSlug} onClose={onCloseNow} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60 py-0.5">
                {menu.items.map((item) => (
                  <NavItemLink key={item.href} item={item} onClose={onCloseNow} />
                ))}
              </div>
            )}

            {menu.featured ? (
              <div className="flex items-center justify-between gap-4 border-t border-border bg-[#f8f9ff] px-4 py-3">
                <p className="text-[11px] leading-snug text-muted-foreground">{menu.featured.description}</p>
                <Link
                  href={menu.featured.href}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
                  onClick={onCloseNow}
                >
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
