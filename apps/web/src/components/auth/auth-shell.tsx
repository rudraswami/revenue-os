"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

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
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/20 via-background to-[#25D366]/10 p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <Link href="/" className="relative flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold">GrowthSync</span>
        </Link>
        <div className="relative space-y-4">
          <h2 className="text-3xl font-bold leading-tight">
            WhatsApp conversations,
            <br />
            synced for growth.
          </h2>
          <p className="max-w-md text-muted-foreground">
            One inbox for your team, a clear pipeline for every customer, and a simple way to connect
            your business number — no technical setup required.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">Trusted by growing WhatsApp-first businesses</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-semibold">GrowthSync</span>
          </Link>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
