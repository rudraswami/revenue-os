import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingPageChrome } from "@/components/marketing/marketing-page-chrome";
import { Button } from "@/components/ui/button";
import { CTA, TAGLINE } from "@/lib/brand-copy";
import { POSITIONING } from "@/lib/gtm-copy";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About Growvisi",
  description:
    "Growvisi is the revenue layer for WhatsApp sales teams — AI classifies leads, humans reply from Inbox, pipeline and revenue ₹ stay visible.",
  path: "/about",
  ogDescription: POSITIONING.oneLiner,
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="py-16 md:py-24">
        <div className="border-b border-border/60 bg-gradient-to-b from-primary-soft/30 to-transparent py-12 md:py-16">
          <div className="mx-auto max-w-[720px] px-6">
            <p className="section-label">About</p>
            <h1 className="display-lg mt-3 text-foreground">{TAGLINE}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-[720px] px-6 py-10 md:py-12">
          <ScrollReveal>
            <p className="body-lg text-muted-foreground">{POSITIONING.subhead}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.05} className="mt-12 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Built for Indian SMBs on the WhatsApp Business Platform, Growvisi connects via Meta&apos;s
              official Cloud API. Your team gets one place for conversations, AI classification, handoffs,
              pipeline stages, and revenue metrics — while sending human replies from Inbox when customers
              need a person.
            </p>
            <p>{POSITIONING.replyNote}</p>
            <p>
              <strong className="text-foreground">Contact:</strong>{" "}
              <a href="mailto:it@growvisi.com" className="text-primary hover:underline">
                it@growvisi.com
              </a>
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button asChild>
                <Link href="/register">{CTA.startTrial}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact#inquiry">{CTA.bookDemo}</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <MarketingFooter />
      <MarketingPageChrome />
    </div>
  );
}
