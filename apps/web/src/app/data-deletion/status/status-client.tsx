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
          <h1 className="text-2xl font-bold">Data deletion status</h1>
          {!code && (
            <p className="mt-4 text-sm text-muted-foreground">
              Missing confirmation code. Use the link from Meta or our{" "}
              <Link href="/data-deletion" className="text-primary hover:underline">
                data deletion instructions
              </Link>
              .
            </p>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          {status && (
            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5 text-sm">
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
              <p className="mt-4 text-muted-foreground">{status.message}</p>
            </div>
          )}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
