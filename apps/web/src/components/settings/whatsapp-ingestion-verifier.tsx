"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { whatsappChatUrl } from "@/lib/whatsapp-onboarding";
import { cn } from "@/lib/utils";

export function WhatsappIngestionVerifier({
  displayPhoneNumber,
  onVerified,
}: {
  displayPhoneNumber: string;
  onVerified?: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const [copied, setCopied] = useState(false);
  const chatUrl = whatsappChatUrl(displayPhoneNumber);

  const { data: stats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ inboundMessages: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    refetchInterval: 3000,
  });

  const verified = (stats?.inboundMessages ?? 0) > 0;

  useEffect(() => {
    if (verified) {
      patchOnboarding({ whatsappConnected: true, firstMessageReceived: true, complete: true });
      onVerified?.();
    }
  }, [verified, patchOnboarding, onVerified]);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(displayPhoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border p-4 transition-colors",
          verified
            ? "border-success/40 bg-success/5"
            : "border-border/80 bg-muted/30",
        )}
      >
        <div className="flex items-start gap-3">
          {verified ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          ) : (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {verified ? "First message received!" : "Waiting for your test message…"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {verified
                ? "Growvisi is ingesting customer WhatsApp messages. Open Conversations to see the thread."
                : "From your personal phone, send any WhatsApp to your business number below. We poll every few seconds."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-sm">
            {displayPhoneNumber}
          </code>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyNumber()}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
          {chatUrl && (
            <Button asChild size="sm" className="gap-1.5 bg-[#25D366] hover:bg-[#1da851]">
              <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
                Open in WhatsApp
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950">
        <strong>Tip:</strong> Meta&apos;s &quot;Send test message&quot; in API Setup is outbound only — it
        won&apos;t appear here. Message <strong>to</strong> your business number from your phone.
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/inbox">
            {verified ? "View conversation" : "Open Conversations"}
          </Link>
        </Button>
        {!verified && (
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings#whatsapp">Diagnostics</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
