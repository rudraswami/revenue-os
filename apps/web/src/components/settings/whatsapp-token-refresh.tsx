"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
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
      setError(toUserMessage(e, "Could not refresh token."));
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

  if (!showWarning && !open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/50 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Meta access token</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Active — your connection is healthy.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-border"
          onClick={() => setOpen(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh token
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        urgent
          ? "border-amber-200/80 bg-card elev-1"
          : "border-border bg-background/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            {urgent ? "Action required" : "Recommended"}
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {urgent
              ? "Refresh your Meta access token"
              : level === "soon"
                ? "Token expiring soon"
                : "Update access token"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {urgent
              ? "Temporary tokens from Meta API Setup expire in about 24 hours. Paste a new one to keep messages flowing."
              : "Refresh proactively so customer conversations never miss a beat."}
          </p>
          {expiryLabel && (
            <p className={cn("mt-2 text-xs font-medium", urgent ? "text-amber-900" : "text-accent")}>
              {expiryLabel}
            </p>
          )}
        </div>
        {!open && (
          <Button
            type="button"
            variant={urgent ? "accent" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => setOpen(true)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh now
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">
            Generate a new token in{" "}
            <a
              href={metaApiSetupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
            >
              Meta API Setup
              <ExternalLink className="h-3 w-3" />
            </a>
            , then paste it below.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Paste your new access token"
              className="rounded-xl border-border"
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
              className="shrink-0 rounded-xl"
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-whatsapp">Token updated — your connection is restored.</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
             
              size="sm"
              className="rounded-xl"
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
