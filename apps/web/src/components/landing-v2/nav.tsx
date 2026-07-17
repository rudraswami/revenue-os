"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { Logo } from "@/components/marketing/logo";
import { cn } from "@/lib/utils";

export function LandingV2Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-[#dce9ff] bg-white/90 shadow-[0_1px_0_rgb(11_28_48/0.04)] backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[76rem] items-center justify-between px-6 lg:px-8">
        <Logo href="/design/landing-v2" />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            {CTA.signIn}
          </Link>
          <Button
            size="sm"
            className={cn(
              "h-9 transition-opacity duration-300",
              scrolled ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            asChild
          >
            <Link href="/register">{CTA.startTrial}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
