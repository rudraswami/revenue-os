import type { Metadata } from "next";
import { CONTACT_PAGE } from "@/lib/brand-copy";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact — Growvisi",
  description: `${CONTACT_PAGE.heroTitle}. Book a demo, WhatsApp us, or email — response within one business day.`,
  path: "/contact",
  ogTitle: "Contact Growvisi — demo, WhatsApp, or email",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
