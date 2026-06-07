import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
  "Reply 24/7 without burning out",
  "Stay on top of every customer message",
  "Auto-create follow-ups from any chat",
  "Track which conversations actually convert",
  "Spot your hottest leads right away",
];

export function AiSection() {
  return (
    <section id="ai" className="surface-lavender py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="section-label">GrowthSync AI</p>
            <h2 className="display-lg mt-3 text-foreground">
              The AI teammate your sales team deserves
            </h2>
            <p className="body-lg mt-5">
              AI that drafts replies from your conversation history, updates pipeline stages
              automatically, and scores leads — so your team focuses on closing, not admin.
            </p>
            <Button className="mt-8" size="lg" asChild>
              <Link href="/register">Try it free for 14 days</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-primary-light/60 bg-white p-8 shadow-sm">
            <ul className="space-y-5">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    ✓
                  </span>
                  <span className="text-[15px] font-medium leading-snug text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
