"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#industries", label: "Solutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#case-study", label: "Case Studies" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <Link href="/login" className="text-[15px] font-medium text-foreground hover:text-accent">
            Log in
          </Link>
          <Link
            href="/register"
            className="btn-primary rounded-lg px-5 py-2.5 text-[14px]"
          >
            Get Started
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
            <a key={link.href} href={link.href} className="text-[15px] font-medium" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <Link href="/login">Log in</Link>
            <Link href="/register" className="btn-primary rounded-lg px-4 py-2.5 text-center text-[14px]">
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
