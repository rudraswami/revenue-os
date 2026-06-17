import Link from "next/link";
import { Logo } from "./logo";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Demo", href: "/demo" },
    { label: "AI", href: "#ai" },
    { label: "Pricing", href: "#pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
    { label: "Data deletion", href: "/data-deletion" },
    { label: "DPA", href: "/dpa" },
    { label: "FAQ", href: "#faq" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-[240px] text-[13px] leading-relaxed text-muted-foreground">
              WhatsApp CRM built for teams that sell through messaging.
            </p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-[13px] font-semibold">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-[13px] text-muted-foreground">
          <div>
            <p>© {new Date().getFullYear()} Growvisi</p>
            <p className="mt-1">
              <a href="mailto:support@growvisi.in" className="hover:text-foreground">
                support@growvisi.in
              </a>
            </p>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
