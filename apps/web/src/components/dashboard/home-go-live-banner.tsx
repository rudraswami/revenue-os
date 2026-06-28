"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

/** Home banner when WhatsApp is connected but go-live checklist is incomplete. */
export function HomeGoLiveBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;

  const { data: progress } = useQuery({
    queryKey: ["whatsapp-onboarding-progress"],
    queryFn: () =>
      apiFetch<{ connected: boolean; progressPct: number }>(
        "/whatsapp-accounts/onboarding-progress",
        { token: token ?? undefined },
      ),
    enabled: !!token && connected,
    staleTime: 30_000,
  });

  if (!connected || !progress || progress.progressPct >= 100) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 to-white px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Finish WhatsApp go-live · {progress.progressPct}% complete
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Confirm webhooks, send a test message, and verify AI classification.
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 rounded-xl">
        <Link href="/onboarding">
          Continue setup
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
