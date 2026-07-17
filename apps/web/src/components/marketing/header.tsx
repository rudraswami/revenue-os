"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { MARKETING_NAV } from "@/lib/marketing-nav";
import { MarketingIcon } from "@/lib/marketing-icons";
import { NavMegaMenu } from "./nav-mega-menu";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50">
      <Link
        href="/register"
        className="group flex items-center justify-center gap-2 bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        <Sparkles className="h-3.5 w-3.5 text-accent-light" />
        <span>From ₹999/mo · Human inbox + pipeline ₹ — 14-day trial, 500 leads</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <header
        className={cn(
          "border-b transition-all duration-300",
          scrolled
            ? "border-border bg-white/90 shadow-[0_4px_24px_rgb(11_28_48/0.06)] backdrop-blur-md"
            : "border-transparent bg-white/70 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3.5 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-6 lg:flex">
            {MARKETING_NAV.map((entry) =>
              entry.type === "dropdown" ? (
                <NavMegaMenu
                  key={entry.dropdown.id}
                  menu={entry.dropdown}
                  open={openMenu === entry.dropdown.id}
                  onOpen={() => setOpenMenu(entry.dropdown.id)}
                  onClose={() => setOpenMenu(null)}
                />
              ) : entry.external ? (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {entry.label}
                </Link>
              ) : (
                <a
                  key={entry.href}
                  href={entry.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {entry.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <Link
              href="/login"
              className="text-sm font-semibold text-foreground transition-colors hover:text-accent"
            >
              {CTA.signIn}
            </Link>
            <Button asChild>
              <Link href="/register">
                {CTA.getStarted}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          className={cn(
            "border-t border-border bg-white px-6 py-4 lg:hidden",
            open ? "block" : "hidden",
          )}
        >
          <nav className="flex flex-col gap-1">
            {MARKETING_NAV.map((entry) =>
              entry.type === "dropdown" ? (
                <div key={entry.dropdown.id} className="border-b border-border/60 py-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-2 text-[15px] font-semibold"
                    onClick={() =>
                      setMobileExpanded((id) =>
                        id === entry.dropdown.id ? null : entry.dropdown.id,
                      )
                    }
                  >
                    {entry.dropdown.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        mobileExpanded === entry.dropdown.id && "rotate-180",
                      )}
                    />
                  </button>
                  {mobileExpanded === entry.dropdown.id && (
                    <div className="space-y-1 pb-2 pl-2">
                      {entry.dropdown.items.map((item) => {
                        const isInternal = item.href.startsWith("/") && !item.external;
                        if (isInternal || item.external) {
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-center gap-2.5 py-2 text-sm text-muted-foreground hover:text-foreground"
                              onClick={() => setOpen(false)}
                            >
                              <MarketingIcon name={item.icon} className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                              {item.label}
                            </Link>
                          );
                        }
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            className="block py-2 text-sm text-muted-foreground"
                            onClick={() => setOpen(false)}
                          >
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : entry.external ? (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="py-2 text-[15px] font-medium"
                  onClick={() => setOpen(false)}
                >
                  {entry.label}
                </Link>
              ) : (
                <a
                  key={entry.href}
                  href={entry.href}
                  className="py-2 text-[15px] font-medium"
                  onClick={() => setOpen(false)}
                >
                  {entry.label}
                </a>
              ),
            )}
            <div className="flex flex-col gap-3 border-t border-border pt-4 mt-2">
              <Link href="/login" onClick={() => setOpen(false)}>
                {CTA.signIn}
              </Link>
              <Button asChild className="w-full">
                <Link href="/register" onClick={() => setOpen(false)}>
                  {CTA.getStarted}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>
    </div>
  );
}
