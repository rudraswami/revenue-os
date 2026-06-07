import Link from "next/link";
import { ArrowRight, Bot, Clock, MessageSquare, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Clock,
    title: "Reply 24/7 without burning out",
    description: "AI drafts replies from your conversation history so you respond in seconds, not hours.",
  },
  {
    icon: MessageSquare,
    title: "Stay on top of every message",
    description: "Never miss a customer — unread alerts and smart prioritization keep hot leads first.",
  },
  {
    icon: Bot,
    title: "Auto-create follow-ups from any chat",
    description: "Turn conversations into pipeline actions automatically when intent is detected.",
  },
  {
    icon: Target,
    title: "Spot your hottest leads right away",
    description: "AI scoring surfaces who is ready to buy so your team focuses on what closes.",
  },
];

export function AiSection() {
  return (
    <section id="ai" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              GrowthSync AI
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              The AI teammate your sales team deserves
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Not just automation — an engine that helps your team respond faster, qualify smarter,
              and close more deals on WhatsApp.
            </p>
            <Button className="mt-8" size="lg" asChild>
              <Link href="/register">
                Try it free for 14 days <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-border bg-muted/30 p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
