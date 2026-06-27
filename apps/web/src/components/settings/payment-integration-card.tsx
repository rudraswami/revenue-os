"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, IndianRupee, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface PaymentIntegration {
  razorpayWebhookSecret: string | null;
  autoWinOnPayment: boolean;
  webhookUrl: string;
  hasWebhookSecret: boolean;
}

export function PaymentIntegrationCard() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["payment-integration"],
    queryFn: () =>
      apiFetch<PaymentIntegration>("/organizations/payment-integration", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const saveMut = useMutation({
    mutationFn: (body: { razorpayWebhookSecret?: string | null; autoWinOnPayment?: boolean }) =>
      apiFetch<PaymentIntegration>("/organizations/payment-integration", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["payment-integration"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save."),
  });

  async function copyUrl() {
    if (!data?.webhookUrl) return;
    await navigator.clipboard.writeText(data.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Razorpay payment → Won</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When a customer pays via Razorpay, matching leads move to Won automatically.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-[#f8f9ff]/40 px-4 py-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Webhook URL
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-white px-2 py-1.5 text-xs">
            {data?.webhookUrl}
          </code>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => void copyUrl()}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          In Razorpay Dashboard → Webhooks, subscribe to <strong>payment.captured</strong>. Add{" "}
          <code className="rounded bg-white px-1">leadId</code> in payment notes to match a
          specific contact, or we match by customer phone.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">Webhook secret</label>
        <Input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={data?.hasWebhookSecret ? "•••••••• (saved — enter to replace)" : "From Razorpay webhook settings"}
          className="mt-1.5 h-10 text-sm"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={data?.autoWinOnPayment ?? true}
          onChange={(e) => saveMut.mutate({ autoWinOnPayment: e.target.checked })}
          className="rounded border-border"
        />
        Automatically move lead to Won on payment.captured
      </label>

      <Button
        type="button"
        size="sm"
        variant="accent"
        disabled={!secret.trim() || saveMut.isPending}
        onClick={() => saveMut.mutate({ razorpayWebhookSecret: secret.trim() })}
      >
        {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save webhook secret"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
