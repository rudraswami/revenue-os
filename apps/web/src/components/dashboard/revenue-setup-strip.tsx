"use client";

import Link from "next/link";
import { Bell, CreditCard, IndianRupee } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

/** Post-connect merchandising — digest, Razorpay→Won, deal value */
export function RevenueSetupStrip({ hasWhatsapp }: { hasWhatsapp: boolean }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data: ops } = useQuery({
    queryKey: ["ops-settings"],
    queryFn: () =>
      apiFetch<{ digest: { enabled: boolean } }>("/organizations/ops-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token && hasWhatsapp,
    staleTime: 60_000,
  });

  if (!hasWhatsapp) return null;

  const digestOn = ops?.digest.enabled ?? false;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card elev-1 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">
        Complete your revenue setup
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/dashboard/automations"
          className="flex items-start gap-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left transition hover:border-accent/30"
        >
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-semibold">
              Morning digest {digestOn ? "· On" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Email or WhatsApp brief for owners (Hindi supported)
            </p>
          </div>
        </Link>
        <Link
          href="/dashboard/settings?tab=growth"
          className="flex items-start gap-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left transition hover:border-accent/30"
        >
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-semibold">Razorpay → Won</p>
            <p className="text-xs text-muted-foreground">
              Auto-mark deals won when payment lands (Growth+)
            </p>
          </div>
        </Link>
        <Link
          href="/dashboard/pipeline"
          className="flex items-start gap-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left transition hover:border-accent/30"
        >
          <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-semibold">Add deal ₹ values</p>
            <p className="text-xs text-muted-foreground">
              Powers Revenue pulse on Home and Analytics
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
