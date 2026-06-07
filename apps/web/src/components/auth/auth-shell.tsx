"use client";

import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

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
        <div className="max-w-md">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-foreground">
            WhatsApp conversations, synced for growth.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            One inbox for your team, a clear pipeline for every customer, and a simple way to
            connect your business number.
          </p>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Trusted by WhatsApp-first businesses worldwide
        </p>
      </div>

      <div className="flex flex-col">
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
          </div>
        </div>
      </div>
    </div>
  );
}
