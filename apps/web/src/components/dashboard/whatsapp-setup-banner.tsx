"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

const DISMISS_KEY = "growvisi-wa-banner-dismissed";

export function WhatsappSetupBanner() {
  const token = useAuthStore((s) => s.accessToken);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 30_000,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;

  if (connected || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="border-b border-primary/15 bg-gradient-to-r from-primary/8 via-[#25D366]/8 to-primary/5 px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E]">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Connect WhatsApp to start receiving customer messages
            </p>
            <p className="text-xs text-muted-foreground">
              ~2 minutes — connect with Meta and start receiving customer messages.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="h-8 gap-1.5">
            <Link href="/onboarding">
              Start setup wizard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
