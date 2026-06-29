import Link from "next/link";
import { CTA, TAGLINE } from "@/lib/brand-copy";
import { Logo } from "./logo";

const links = {
  Product: [
    { label: "Features", href: "/#product" },
    { label: "How it works", href: "/#engine" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Demo", href: "/demo" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Case Studies", href: "/#case-study" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
    { label: "DPA", href: "/dpa" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
              {TAGLINE}.
            </p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-[13px] font-semibold">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-[13px] text-muted-foreground hover:text-foreground">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-[13px] text-muted-foreground">
          <p>© {new Date().getFullYear()} Growvisi</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              {CTA.signIn}
            </Link>
            <Link href="/register" className="font-semibold text-accent hover:underline">
              {CTA.getStarted}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
