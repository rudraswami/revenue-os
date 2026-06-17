"use client";

import Link from "next/link";
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
        <Logo />
        <div className="mx-auto w-full max-w-sm">
          <PhoneMockup>
            <WhatsAppChat messages={AI_PHONE_CHAT} contactName="Essence Lab" />
          </PhoneMockup>
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            WhatsApp conversations, synced for growth.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            One inbox, a clear pipeline, and AI that keeps every lead moving.
          </p>
        </div>
      </div>

      <div className="flex flex-col bg-white">
        <header className="border-b border-border px-6 py-4 lg:hidden">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">{description}</p>
            </div>
            {children}
            <p className="mt-8 text-center text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
