"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { AnnouncementBar } from "./announcement-bar";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#engine", label: "How it works" },
  { href: "#product", label: "Product" },
  { href: "#compare", label: "Why us" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <AnnouncementBar />
      <div className="border-b border-border/60 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-3.5">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-[14px] font-medium text-foreground transition-colors hover:text-primary"
            >
              Log in
            </Link>
            <Link href="/register" className="btn-wa rounded-full px-5 py-2 text-[14px] font-bold">
              Start for FREE
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

        <div className={cn("border-t border-border bg-white px-6 py-4 md:hidden", open ? "block" : "hidden")}>
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[14px] font-medium text-muted-foreground"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <Link href="/login" className="text-[14px] font-medium" onClick={() => setOpen(false)}>
                Log in
              </Link>
              <Button asChild className="btn-wa border-0">
                <Link href="/register">Start for FREE</Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
