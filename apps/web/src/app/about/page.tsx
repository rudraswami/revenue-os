import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export const metadata: Metadata = {
  title: "About Growvisi",
  description:
    "Growvisi helps businesses turn WhatsApp conversations into pipeline intelligence while Meta handles in-chat replies.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="py-16 md:py-24">
        <div className="border-b border-border/60 bg-gradient-to-b from-primary-soft/30 to-transparent py-12 md:py-16">
          <div className="mx-auto max-w-[720px] px-6">
            <p className="section-label">About</p>
            <h1 className="display-lg mt-3 text-foreground">
              WhatsApp intelligence for teams that sell through messaging
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-[720px] px-6 py-10 md:py-12">
          <ScrollReveal>
            <p className="body-lg text-muted-foreground">
              Growvisi ingests customer WhatsApp threads, classifies intent, scores leads, and tracks your
              pipeline end-to-end. We complement Meta Business Agent — Meta replies in WhatsApp; Growvisi
              helps you operate growth.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.05} className="mt-12 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Built for Indian and global SMBs using the WhatsApp Business Platform, Growvisi connects via
              Meta&apos;s official Cloud API. Your team gets a single place to see conversations, pipeline
              stages, and AI-assisted classification — without replacing Meta&apos;s in-chat experience.
            </p>
            <p>
              <strong className="text-foreground">Contact:</strong>{" "}
              <a href="mailto:support@growvisi.in" className="text-primary hover:underline">
                support@growvisi.in
              </a>
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button asChild>
                <Link href="/register">Start free trial</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">Contact sales</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
