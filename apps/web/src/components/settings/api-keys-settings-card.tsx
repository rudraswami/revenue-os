"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Key, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutationPendingId } from "@/hooks/use-mutation-pending-id";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { formatRelative } from "@/lib/crm";
import { useAuthStore } from "@/stores/auth-store";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysSettingsCard() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [name, setName] = useState("Production");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: keys, isLoading, isError } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch<ApiKeyRow[]>("/api-keys", { token: token ?? undefined }),
    enabled: !!token,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ApiKeyRow & { secret: string }>("/api-keys", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ name }),
      }),
    onSuccess: (res) => {
      setNewSecret(res.secret);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e) => {
      setError(toUserMessage(e, "Could not create API key."));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api-keys/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const pendingRevokeId = useMutationPendingId(revokeMutation);

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        API keys are available on the Pro plan after billing is active.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bento-mint text-accent">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">API keys</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pro plan — read leads and conversations from your own integrations.
          </p>
        </div>
      </div>

      {newSecret && (
        <div className="rounded-xl border border-accent/30 bg-bento-mint/40 p-3 text-xs">
          <p className="font-semibold text-accent">Copy your key now — it won&apos;t be shown again.</p>
          <code className="mt-2 block break-all rounded-lg bg-card px-2 py-1.5 font-mono text-xs">
            {newSecret}
          </code>
          <p className="mt-3 font-medium text-foreground">Example requests</p>
          <code className="mt-1 block whitespace-pre-wrap break-all rounded-lg bg-card px-2 py-1.5 font-mono text-xs text-muted-foreground">
            {`# List leads
curl -H "Authorization: Bearer ${newSecret}" \\
  https://api.growvisi.in/api/v1/external/leads

# List conversations
curl -H "Authorization: Bearer ${newSecret}" \\
  https://api.growvisi.in/api/v1/external/conversations`}
          </code>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key label"
          className="max-w-[200px] rounded-xl"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          disabled={createMutation.isPending || !name.trim()}
          isLoading={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Create key
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="space-y-2">
          {(keys ?? []).map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</p>
                <p className="text-xs text-muted-foreground">
                  {k.scopes.join(", ")}
                  {k.lastUsedAt ? ` · used ${formatRelative(k.lastUsedAt)}` : " · never used"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(k.id)}
              >
                {pendingRevokeId === k.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </li>
          ))}
          {keys?.length === 0 && (
            <p className="text-xs text-muted-foreground">No API keys yet.</p>
          )}
        </ul>
      )}
    </div>
  );
}
