"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavDropdown, NavLinkItem } from "@/lib/marketing-nav";
import { PRODUCT_PAGES, type ProductPageSlug } from "@/lib/product-pages";
import { SOLUTION_PAGES, type SolutionPageSlug } from "@/lib/solution-pages";
import {
  AnalyticsPreview,
  AutomationsPreview,
  InboxPreview,
  PipelinePreview,
  ScoringPreview,
} from "./dashboard-previews";
import { SolutionHeroVisual } from "./solution-visuals";

const PRODUCT_PREVIEWS: Record<ProductPageSlug, React.ComponentType> = {
  conversations: InboxPreview,
  intelligence: ScoringPreview,
  pipeline: PipelinePreview,
  analytics: AnalyticsPreview,
  automations: AutomationsPreview,
};

const SOLUTION_PREVIEWS: Record<SolutionPageSlug, React.ComponentType<{ slug: SolutionPageSlug }>> = {
  "real-estate": SolutionHeroVisual,
  education: SolutionHeroVisual,
  healthcare: SolutionHeroVisual,
  d2c: SolutionHeroVisual,
};

const CLOSE_DELAY_MS = 180;

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
  const Icon = item.icon;
  const className = cn(
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
    active ? "bg-[#ecfdf5] ring-1 ring-accent/15" : "hover:bg-[#f8f9ff]",
  );

  const inner = (
    <>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          active ? "bg-accent text-white" : "bg-bento-mint text-accent group-hover:bg-accent/10",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
          {item.label}
          <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{item.description}</p>
      </div>
    </>
  );

  const isInternal = item.href.startsWith("/") && !item.external;

  if (isInternal) {
    return (
      <Link
        href={item.href}
        className={className}
        onMouseEnter={onHover}
        onClick={onClose}
      >
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

export function NavMegaMenu({
  menu,
  open,
  onOpen,
  onClose,
}: {
  menu: NavDropdown;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstProductSlug = menu.items.find((i) => i.productSlug)?.productSlug ?? null;
  const firstSolutionSlug = menu.items.find((i) => i.solutionSlug)?.solutionSlug ?? null;
  const [hoverProductSlug, setHoverProductSlug] = useState<ProductPageSlug | null>(firstProductSlug);
  const [hoverSolutionSlug, setHoverSolutionSlug] = useState<SolutionPageSlug | null>(firstSolutionSlug);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onClose, CLOSE_DELAY_MS);
  }, [onClose]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    onOpen();
  }, [onOpen]);

  const isProduct = menu.variant === "product";
  const isSolution = menu.variant === "solution";
  const previewProductSlug = hoverProductSlug ?? firstProductSlug;
  const previewSolutionSlug = hoverSolutionSlug ?? firstSolutionSlug;
  const previewProduct = previewProductSlug ? PRODUCT_PAGES[previewProductSlug] : null;
  const previewSolution = previewSolutionSlug ? SOLUTION_PAGES[previewSolutionSlug] : null;
  const ProductPreviewComponent = previewProductSlug ? PRODUCT_PREVIEWS[previewProductSlug] : null;
  const SolutionPreviewComponent = previewSolutionSlug ? SOLUTION_PREVIEWS[previewSolutionSlug] : null;

  return (
    <div className="relative" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-1 py-1 text-[14px] font-medium transition-colors",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? onClose() : onOpen())}
      >
        {menu.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        /* pt-3 bridge keeps hover alive — no dead gap between trigger and panel */
        <div
          className={cn(
            "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3",
            isProduct ? "w-[min(100vw-2rem,720px)]" : isSolution ? "w-[min(100vw-2rem,720px)]" : "w-[min(100vw-2rem,480px)]",
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgb(11_28_48/0.14)]">
            {isProduct && previewProduct && ProductPreviewComponent ? (
              <div className="grid lg:grid-cols-[1fr_280px]">
                <div className="space-y-0.5 p-2">
                  {menu.items.map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      active={item.productSlug === previewProductSlug}
                      onHover={() => item.productSlug && setHoverProductSlug(item.productSlug)}
                      onClose={onClose}
                    />
                  ))}
                </div>
                <div className="hidden border-l border-border bg-gradient-to-br from-[#f8f9ff] to-white p-4 lg:block">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {previewProduct.eyebrow}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-snug">{previewProduct.headline}</p>
                  <div className="mt-4 rounded-xl border border-border/80 bg-white p-3 shadow-sm">
                    <ProductPreviewComponent />
                  </div>
                  <Link
                    href={`/product/${previewProduct.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    onClick={onClose}
                  >
                    Explore {previewProduct.navLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : isSolution && previewSolution && SolutionPreviewComponent && previewSolutionSlug ? (
              <div className="grid lg:grid-cols-[1fr_280px]">
                <div className="space-y-0.5 p-2">
                  {menu.items.map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      active={item.solutionSlug === previewSolutionSlug}
                      onHover={() => item.solutionSlug && setHoverSolutionSlug(item.solutionSlug)}
                      onClose={onClose}
                    />
                  ))}
                </div>
                <div
                  className="hidden border-l border-border p-4 lg:block"
                  style={{
                    background: `linear-gradient(135deg, ${previewSolution.accentColor}12, #f8f9ff)`,
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: previewSolution.accentColor }}
                  >
                    {previewSolution.navLabel}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-snug line-clamp-3">{previewSolution.headline}</p>
                  <div className="mt-4 rounded-xl border border-white/20 bg-gradient-to-br from-[#0b1c30] to-[#132a45] p-3 shadow-sm">
                    <SolutionPreviewComponent slug={previewSolutionSlug} />
                  </div>
                  <Link
                    href={`/solutions/${previewSolution.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    onClick={onClose}
                  >
                    Explore {previewSolution.navLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {menu.items.map((item) => (
                  <NavItemLink key={item.href} item={item} onClose={onClose} />
                ))}
              </div>
            )}

            {menu.featured && (
              <div className="border-t border-border bg-gradient-to-r from-bento-mint/40 to-white px-5 py-3.5">
                <Link
                  href={menu.featured.href}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline"
                  onClick={onClose}
                >
                  {menu.featured.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{menu.featured.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
