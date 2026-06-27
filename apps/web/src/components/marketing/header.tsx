"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, Sparkles, X } from "lucide-react";
import { CTA } from "@/lib/brand-copy";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#engine", label: "How it works" },
  { href: "#industries", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "/agencies", label: "Agencies", external: true },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50">
      {/* Announcement bar */}
      <Link
        href="/register"
        className="group flex items-center justify-center gap-2 bg-[#0b1c30] px-4 py-2 text-center text-[13px] font-medium text-white/90 transition-colors hover:text-white"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#6cf8bb]" />
        <span>
          Human inbox + pipeline ₹ — 14-day trial, 500 leads
        </span>
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

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) =>
              "external" in link && link.external ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-accent after:transition-all hover:after:w-full"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-accent after:transition-all hover:after:w-full"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <Link
              href="/login"
              className="text-[14px] font-semibold text-foreground transition-colors hover:text-accent"
            >
              {CTA.signIn}
            </Link>
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[14px]"
            >
              {CTA.getStarted}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          className={cn(
            "border-t border-border bg-white px-6 py-4 md:hidden",
            open ? "block" : "hidden",
          )}
        >
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) =>
              "external" in link && link.external ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[15px] font-medium"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[15px] font-medium"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ),
            )}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <Link href="/login" onClick={() => setOpen(false)}>
                {CTA.signIn}
              </Link>
              <Link
                href="/register"
                className="btn-primary rounded-xl px-4 py-2.5 text-center text-[15px]"
                onClick={() => setOpen(false)}
              >
                {CTA.getStarted}
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </div>
  );
}
