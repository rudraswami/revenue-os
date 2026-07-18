"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { MARKETING_NAV } from "@/lib/marketing-nav";
import { NavMegaMenu } from "./nav-mega-menu";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelNavClose = useCallback(() => {
    if (navCloseTimer.current) {
      clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
  }, []);

  const scheduleNavClose = useCallback(() => {
    cancelNavClose();
    navCloseTimer.current = setTimeout(() => setOpenMenu(null), 280);
  }, [cancelNavClose]);

  const closeMenuNow = useCallback(() => {
    cancelNavClose();
    setOpenMenu(null);
  }, [cancelNavClose]);

  useEffect(() => () => cancelNavClose(), [cancelNavClose]);

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
        className="group flex items-center justify-center gap-2 border-b border-accent/20 bg-[#0b1c30] px-4 py-2 text-center text-[13px] font-medium text-white/90 transition-colors hover:bg-[#0f2438]"
      >
        <span className="font-semibold text-[#6cf8bb]">YOUR TURN</span>
        <span className="hidden sm:inline"> when customers need a human · Pipeline ₹ tracked · 14-day trial</span>
        <ArrowRight className="h-3.5 w-3.5 text-[#6cf8bb] transition-transform group-hover:translate-x-0.5" />
      </Link>

      <header
        className={cn(
          "border-b transition-all duration-300",
          scrolled
            ? "border-border/80 bg-white/95 shadow-[0_1px_0_rgb(11_28_48/0.04)] backdrop-blur-md"
            : "border-transparent bg-white/80 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex h-[3.75rem] max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex">
            {MARKETING_NAV.map((entry) =>
              entry.type === "dropdown" ? (
                <NavMegaMenu
                  key={entry.dropdown.id}
                  menu={entry.dropdown}
                  open={openMenu === entry.dropdown.id}
                  onActivate={() => {
                    cancelNavClose();
                    setOpenMenu(entry.dropdown.id);
                  }}
                  onScheduleClose={scheduleNavClose}
                  onCancelClose={cancelNavClose}
                  onCloseNow={closeMenuNow}
                />
              ) : entry.external ? (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="rounded-md px-2 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {entry.label}
                </Link>
              ) : (
                <a
                  key={entry.href}
                  href={entry.href}
                  className="rounded-md px-2 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {entry.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {CTA.signIn}
            </Link>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/register">
                {CTA.getStarted}
                <ArrowRight className="h-3.5 w-3.5" />
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
                    <div className="divide-y divide-border/50">
                      {entry.dropdown.items.map((item) => {
                        const isInternal = item.href.startsWith("/") && !item.external;
                        const rowClass =
                          "block px-1 py-3 text-left transition-colors hover:bg-[#fafbff]";
                        if (isInternal || item.external) {
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={rowClass}
                              onClick={() => setOpen(false)}
                            >
                              <p className="text-[14px] font-semibold">{item.label}</p>
                              <p className="mt-0.5 text-[12px] text-muted-foreground">{item.description}</p>
                            </Link>
                          );
                        }
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            className={rowClass}
                            onClick={() => setOpen(false)}
                          >
                            <p className="text-[14px] font-semibold">{item.label}</p>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{item.description}</p>
                          </a>
                        );
                      })}
                      {entry.dropdown.featured ? (
                        <Link
                          href={entry.dropdown.featured.href}
                          className="mt-2 inline-flex items-center gap-1 pl-3 text-[12px] font-semibold text-accent"
                          onClick={() => setOpen(false)}
                        >
                          {entry.dropdown.featured.label}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : null}
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
            <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
              <Link href="/login" className="text-[15px] font-medium" onClick={() => setOpen(false)}>
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
