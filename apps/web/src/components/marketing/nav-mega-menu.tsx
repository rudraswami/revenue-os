"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavDropdown } from "@/lib/marketing-nav";

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
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 text-[14px] font-medium transition-colors",
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
        <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(100vw-2rem,520px)] -translate-x-1/2">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgb(11_28_48/0.12)]">
            <div className="grid gap-0 sm:grid-cols-2">
              {menu.items.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bento-mint text-accent">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </>
                );
                const className =
                  "flex gap-3 px-4 py-3.5 transition-colors hover:bg-[#f8f9ff] sm:px-5";

                return item.external ? (
                  <Link key={item.label} href={item.href} className={className} onClick={onClose}>
                    {inner}
                  </Link>
                ) : (
                  <a key={item.label} href={item.href} className={className} onClick={onClose}>
                    {inner}
                  </a>
                );
              })}
            </div>
            {menu.featured && (
              <div className="border-t border-border bg-gradient-to-r from-bento-mint/40 to-white px-5 py-3.5">
                <Link
                  href={menu.featured.href}
                  className="block text-[13px] font-semibold text-accent hover:underline"
                  onClick={onClose}
                >
                  {menu.featured.label} →
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
