"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export function AiCapabilitiesBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: capabilities } = useQuery({
    queryKey: ["conversation-capabilities"],
    queryFn: () =>
      apiFetch<{ aiClassification: boolean; aiSuggestReply: boolean }>(
        "/conversations/capabilities",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 300_000,
  });

  if (!capabilities || capabilities.aiClassification) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <div className="flex-1">
        <p className="font-semibold">AI classification is off for this deployment</p>
        <p className="mt-1 text-[13px] text-amber-900/85">
          Set <code className="rounded bg-white/70 px-1">OPENAI_API_KEY</code> on the API
          project so inbound messages are scored and pipeline stages update automatically.
        </p>
      </div>
    </div>
  );
}

export function OnboardingBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const connected = accounts?.some((a) => a.isActive) ?? false;
  if (connected || !token) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-bento-mint/50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Connect WhatsApp to start capturing revenue</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Paste your Meta token — we auto-detect your number and ingest customer messages.
        </p>
      </div>
      <Link
        href="/onboarding"
        className="inline-flex shrink-0 items-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
      >
        Connect now
      </Link>
    </div>
  );
}
