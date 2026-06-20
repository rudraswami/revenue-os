"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Mail, Users } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { apiFetch, ApiError } from "@/lib/api-client";

const benefits = [
  {
    icon: Calendar,
    title: "Personalized walkthrough",
    description: "See Inbox, Pipeline, Intelligence, and lead scoring tailored to your WhatsApp sales workflow.",
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
      setError(err instanceof ApiError ? err.message : "Could not send request. Email support@growvisi.in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="py-16 md:py-24">
        <div className="border-b border-border/60 bg-gradient-to-b from-primary-soft/20 to-transparent py-10 md:py-14">
          <div className="mx-auto max-w-[1120px] px-6">
            <p className="section-label">Get a demo</p>
            <h1 className="display-lg mt-3 max-w-2xl text-foreground">
              Book a demo of the AI Revenue Engine
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-[1120px] px-6 py-12 md:py-16">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-start">
            <ScrollReveal>
              <p className="body-lg">
                Book a walkthrough or contact sales for Enterprise pricing. We&apos;ll show you how
                Growvisi turns WhatsApp conversations into scored pipeline and closed revenue.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Email us directly:{" "}
                <a href="mailto:support@growvisi.in" className="font-medium text-primary hover:underline">
                  support@growvisi.in
                </a>
              </p>

              <ul className="mt-10 space-y-6">
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
                Prefer to explore on your own?{" "}
                <Link href="/demo" className="font-medium text-primary hover:underline">
                  Try the interactive demo
                </Link>{" "}
                or{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  start free for 14 days
                </Link>
                .
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="product-frame p-8 md:p-10">
                {submitted ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                    <h2 className="mt-4 text-xl font-bold">Request received</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Thanks for reaching out. We&apos;ll contact you within one business day.
                    </p>
                    <div className="mt-8 flex flex-col gap-3">
                      <Button asChild>
                        <Link href="/demo">Explore demo while you wait</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/">Back to home</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold">Request a demo</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fill in your details and we&apos;ll be in touch.
                    </p>
                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                            Request demo <ArrowRight className="h-4 w-4" />
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
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
