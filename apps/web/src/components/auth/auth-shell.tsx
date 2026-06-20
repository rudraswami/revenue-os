"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { PhoneMockup } from "@/components/marketing/phone-mockup";
import { WhatsAppChat, AI_PHONE_CHAT } from "@/components/marketing/animated-chat";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="surface-lavender relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <Logo />
        <div className="relative mx-auto w-full max-w-sm">
          <PhoneMockup>
            <WhatsAppChat messages={AI_PHONE_CHAT} contactName="Essence Lab" />
          </PhoneMockup>
        </div>
        <div className="relative max-w-md">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Conversation intelligence
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            WhatsApp conversations, synced for growth.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            One inbox, a clear pipeline, and AI that keeps every lead moving — without changing the
            number your customers already use.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Encrypted tokens · GDPR-ready · Meta-compliant
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-white">
        <header className="border-b border-border/80 px-6 py-4 lg:hidden">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-10 md:py-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm md:p-7">
              {children}
            </div>
            <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
              By continuing you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>
              ,{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/data-deletion" className="underline hover:text-foreground">
                Data deletion
              </Link>{" "}
              instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
