"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, IndianRupee, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { canManageBilling } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { useShellPaymentIntegration } from "@/hooks/use-shell-data";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import { QUERY_KEYS } from "@/lib/query-config";

interface PaymentIntegration {
  autoWinOnPayment: boolean;
  webhookUrl: string;
  hasWebhookSecret: boolean;
}

export function PaymentIntegrationCard() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const qc = useQueryClient();
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageBilling(role);

  const { data, isLoading } = useShellPaymentIntegration<PaymentIntegration>({
    allowFetchBeforeBootstrap: true,
    enabled: canManage,
  });

  const saveMut = useMutation({
    mutationFn: (body: { razorpayWebhookSecret?: string | null; autoWinOnPayment?: boolean }) =>
      apiFetch<PaymentIntegration>("/organizations/payment-integration", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(body),
      }),
    onMutate: async (body) => {
      // Only the boolean toggle is safe to reflect instantly; the secret field
      // is write-only and never rendered back.
      if (body.autoWinOnPayment === undefined) return { previous: undefined };
      await qc.cancelQueries({ queryKey: QUERY_KEYS.paymentIntegration });
      const previous = qc.getQueryData<PaymentIntegration>(QUERY_KEYS.paymentIntegration);
      if (previous) {
        qc.setQueryData<PaymentIntegration>(QUERY_KEYS.paymentIntegration, {
          ...previous,
          autoWinOnPayment: body.autoWinOnPayment,
        });
      }
      return { previous };
    },
    onSuccess: () => {
      setError(null);
      invalidateWorkspaceShellCache(qc);
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(QUERY_KEYS.paymentIntegration, ctx.previous);
      }
      setError(toUserMessage(e, "Could not save."));
    },
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bento-mint text-accent">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Razorpay payment → Won</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When a customer pays via Razorpay, matching leads move to Won automatically.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-background/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">
          Webhook URL
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-card px-2 py-1.5 text-xs">
            {data?.webhookUrl}
          </code>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => void copyUrl()}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          In Razorpay Dashboard → Webhooks, subscribe to <strong>payment.captured</strong>. Add{" "}
          <code className="rounded bg-card px-1">leadId</code> in payment notes to match a
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
       
        disabled={!secret.trim() || saveMut.isPending}
        onClick={() => saveMut.mutate({ razorpayWebhookSecret: secret.trim() })}
      >
        {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save webhook secret"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
