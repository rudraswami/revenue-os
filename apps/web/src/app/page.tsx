import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden grid-bg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-semibold">Revenue OS</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-medium text-accent">AI Revenue Operating System</p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Turn WhatsApp conversations into{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            predictable revenue
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Autonomous AI sales agents, pipeline intelligence, and real-time funnel analytics —
          built for enterprise WhatsApp-first businesses.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Launch command center</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">View demo workspace</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
