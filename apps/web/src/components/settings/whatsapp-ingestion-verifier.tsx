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
          "rounded-xl border p-5 transition-colors",
          verified
            ? "border-[#6cf8bb]/40 bg-[#ecfdf5]/60"
            : "border-[#dce9ff] bg-[#f8f9ff]/80",
        )}
      >
        <div className="flex items-start gap-3">
          {verified ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#128C7E]" />
          ) : (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-accent" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {verified ? "You're live — first message received" : "Send a quick test message"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {verified
                ? "Customer WhatsApp messages are flowing into Growvisi. Open Conversations to see your thread."
                : "Message your business number from your personal phone. We'll detect it automatically."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-[#dce9ff] bg-white px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm">
            {displayPhoneNumber}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => void copyNumber()}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy number"}
          </Button>
          {chatUrl && !verified && (
            <Button asChild size="sm" className="gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1da851]">
              <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
                Open WhatsApp
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {!verified && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Tip: Meta&apos;s test send in API Setup is outbound only. Message{" "}
          <strong className="text-foreground">to</strong> your business line from your phone.
        </p>
      )}

      <Button asChild variant={verified ? "accent" : "outline"} className="rounded-xl">
        <Link href="/dashboard/inbox">
          {verified ? "View in Conversations" : "Open Conversations"}
        </Link>
      </Button>
    </div>
  );
}
