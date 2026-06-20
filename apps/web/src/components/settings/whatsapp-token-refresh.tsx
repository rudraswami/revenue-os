"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { looksLikeMetaToken } from "@/lib/whatsapp-onboarding";

export function WhatsappTokenRefresh({
  accountId,
  metaApiSetupUrl,
  level,
  needsRefresh,
  needsAttention,
  hoursRemaining,
  expiresAt,
}: {
  accountId: string;
  metaApiSetupUrl: string;
  level?: "ok" | "soon" | "urgent";
  needsRefresh?: boolean;
  needsAttention?: boolean;
  hoursRemaining?: number | null;
  expiresAt?: string | null;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState("");
  const urgent = level === "urgent" || needsRefresh;
  const showWarning = urgent || needsAttention || level === "soon";
  const [open, setOpen] = useState(urgent ?? false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/whatsapp-accounts/${accountId}/refresh-token`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ accessToken: accessToken.trim() }),
      }),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setAccessToken("");
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-connection-health"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not refresh token.");
      setSuccess(false);
    },
  });

  const expiryLabel =
    hoursRemaining != null
      ? hoursRemaining < 1
        ? "Expires in less than 1 hour"
        : `Expires in ~${Math.ceil(hoursRemaining)} hours`
      : expiresAt
        ? `Expires ${new Date(expiresAt).toLocaleString()}`
        : null;

  return (
    <div
      className={
        urgent
          ? "rounded-xl border border-amber-200/80 bg-amber-50/80 p-4"
          : showWarning
            ? "rounded-xl border border-blue-200/60 bg-blue-50/50 p-4"
            : "rounded-xl border border-border/80 bg-muted/20 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {urgent
              ? "Refresh your Meta access token"
              : level === "soon"
                ? "Token expiring soon"
                : "Access token"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {urgent
              ? "Temporary API Setup tokens expire in ~24h. Paste a new token to keep ingestion running."
              : level === "soon"
                ? "Your token still works — refresh in the next few hours to avoid gaps."
                : "Meta temporary tokens expire periodically. Refresh here without disconnecting."}
          </p>
          {expiryLabel && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                urgent ? "text-amber-900" : "text-primary",
              )}
            >
              {expiryLabel}
            </p>
          )}
        </div>
        {!open && (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh token
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Generate a new token in{" "}
            <a
              href={metaApiSetupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Meta API Setup
            </a>
            , then paste below.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Paste new EAA… token"
              value={accessToken}
              onChange={(e) => {
                setAccessToken(e.target.value);
                setError(null);
                setSuccess(false);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text.trim()) setAccessToken(text.trim());
                } catch {
                  setError("Paste manually with Ctrl+V.");
                }
              }}
            >
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && (
            <p className="text-xs text-success">Token updated — webhooks re-subscribed.</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!looksLikeMetaToken(accessToken) || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save new token
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
