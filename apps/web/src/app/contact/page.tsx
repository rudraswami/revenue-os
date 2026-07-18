"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Mail, Users } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingPageChrome } from "@/components/marketing/marketing-page-chrome";
import { WhatsAppInquiryPanel } from "@/components/marketing/whatsapp-inquiry-panel";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_PAGE } from "@/lib/brand-copy";
import { apiFetch, toUserMessage } from "@/lib/api-client";

const benefits = [
  {
    icon: Calendar,
    title: "Personalized walkthrough",
    description: "See Inbox, Pipeline, Intelligence, and YOUR TURN on your workflow.",
  },
  {
    icon: Users,
    title: "For teams of any size",
    description: "From solo founders to sales teams — we'll show you the right plan.",
  },
  {
    icon: Mail,
    title: "Response within 1 business day",
    description: "Our team reaches out with next steps and answers your questions.",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await apiFetch("/contact", {
        method: "POST",
        skipAuthRetry: true,
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
          team: form.get("team") || undefined,
          message: form.get("message") || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(toUserMessage(err, "Could not send request. Email support@growvisi.in"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <div className="border-b border-border/60 bg-gradient-to-b from-primary-soft/20 to-transparent py-10 md:py-14">
          <div className="mx-auto max-w-[1120px] px-6">
            <p className="section-label">{CONTACT_PAGE.heroLabel}</p>
            <h1 className="display-lg mt-3 max-w-2xl text-foreground">{CONTACT_PAGE.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              {CONTACT_PAGE.heroSubtitle}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm" className="h-10">
                <Link href="#inquiry">WhatsApp inquiry</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-10">
                <Link href="#email-demo">Email demo</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1120px] space-y-16 px-6 py-12 md:space-y-20 md:py-16">
          <WhatsAppInquiryPanel id="inquiry" />

          <section id="email-demo" className="scroll-mt-24">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              {CONTACT_PAGE.emailSectionTitle}
            </h2>
            <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:items-start">
              <ScrollReveal>
                <ul className="space-y-6">
                  {benefits.map((b) => (
                    <li key={b.title} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <b.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{b.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-10 text-sm text-muted-foreground">
                  Prefer self-serve?{" "}
                  <Link href="/demo" className="font-medium text-primary hover:underline">
                    Interactive demo
                  </Link>{" "}
                  or{" "}
                  <Link href="/register" className="font-medium text-primary hover:underline">
                    14-day trial
                  </Link>
                  .
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <div className="product-frame p-8 md:p-10">
                  {submitted ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                      <h3 className="mt-4 text-xl font-bold">Request received</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        We&apos;ll email you within one business day. Faster?{" "}
                        <Link href="#inquiry" className="font-semibold text-accent hover:underline">
                          Message on WhatsApp
                        </Link>
                        .
                      </p>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                            Full name
                          </label>
                          <Input id="name" name="name" placeholder="Jane Smith" required />
                        </div>
                        <div>
                          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                            Work email
                          </label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@company.com"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="company" className="mb-1.5 block text-sm font-medium">
                            Company
                          </label>
                          <Input id="company" name="company" placeholder="Acme Retail" required />
                        </div>
                        <div>
                          <label htmlFor="team" className="mb-1.5 block text-sm font-medium">
                            Team size
                          </label>
                          <select
                            id="team"
                            name="team"
                            required
                            className="flex h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <option value="">Select…</option>
                            <option value="1-5">1–5 people</option>
                            <option value="6-20">6–20 people</option>
                            <option value="21-50">21–50 people</option>
                            <option value="50+">50+ people</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                            What are you looking to solve?
                          </label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Tell us about your WhatsApp sales workflow…"
                            rows={4}
                          />
                        </div>
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                          {loading ? "Sending…" : (
                            <>
                              Send email request <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                      </form>
                    </>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
      <MarketingPageChrome />
    </div>
  );
}
