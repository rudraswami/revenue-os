"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { apiFetch } from "@/lib/api-client";

export default function DataDeletionStatusClient() {
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const [status, setStatus] = useState<{
    confirmationCode: string;
    status: string;
    receivedAt: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    apiFetch<{
      confirmationCode: string;
      status: string;
      receivedAt: string;
      message: string;
    }>(`/webhooks/meta/data-deletion/status?code=${encodeURIComponent(code)}`, {
      skipAuthRetry: true,
    })
      .then(setStatus)
      .catch(() => setError("Could not load deletion status for this code."));
  }, [code]);

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="py-16">
        <div className="mx-auto max-w-[560px] px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Meta callback</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Data deletion status</h1>
          {!code && (
            <div className="mt-6 rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
              Missing confirmation code. Use the link from Meta or our{" "}
              <Link href="/data-deletion" className="text-primary hover:underline">
                data deletion instructions
              </Link>
              .
            </div>
          )}
          {error && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {status && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
              <div className="border-b border-border/60 bg-muted/20 px-5 py-3">
                <p className="text-sm font-semibold">Request received</p>
              </div>
              <div className="space-y-2 p-5 text-sm">
              <p>
                <span className="text-muted-foreground">Confirmation code:</span>{" "}
                <span className="font-mono">{status.confirmationCode}</span>
              </p>
              <p className="mt-2">
                <span className="text-muted-foreground">Status:</span> {status.status}
              </p>
              <p className="mt-2">
                <span className="text-muted-foreground">Received:</span>{" "}
                {new Date(status.receivedAt).toLocaleString()}
              </p>
              <p className="mt-4 border-t border-border/60 pt-4 text-muted-foreground">{status.message}</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
