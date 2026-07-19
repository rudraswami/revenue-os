"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Webhook } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMutationPendingId } from "@/hooks/use-mutation-pending-id";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { canManageTeam } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { formatRelative } from "@/lib/crm";

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
}

interface WebhooksConfig {
  endpoints: WebhookEndpoint[];
  deliveries: Array<{
    id: string;
    endpointId: string;
    event: string;
    statusCode: number | null;
    success: boolean;
    error?: string;
    deliveredAt: string;
  }>;
}

const EVENT_OPTIONS = [
  { id: "lead.stage.changed", label: "Lead stage changed" },
  { id: "lead.created", label: "New lead created" },
] as const;

export function WebhooksSettingsCard() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const qc = useQueryClient();

  const [name, setName] = useState("CRM sync");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.stage.changed"]);
  const [newSecret, setNewSecret] = useState<{ endpointId: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch<WebhooksConfig>("/webhooks", { token: token ?? undefined }),
    enabled: !!token,
    retry: false,
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<WebhookEndpoint>("/webhooks", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ name, url, events }),
      }),
    onSuccess: (ep) => {
      setNewSecret({ endpointId: ep.id, secret: ep.secret });
      setUrl("");
      setError(null);
      void qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e) => setError(toUserMessage(e, "Could not create webhook.")),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch(`/webhooks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const testMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/webhooks/${id}/test`, { method: "POST", token: token ?? undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/webhooks/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const pendingTestId = useMutationPendingId(testMut);
  const pendingDeleteId = useMutationPendingId(deleteMut);
  const pendingToggle = toggleMut.isPending ? toggleMut.variables : undefined;

  function toggleEvent(id: string) {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Outbound webhooks are available on the Pro plan after billing is active.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Webhook className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Outbound webhooks</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Push lead events to your CRM or automation stack. Signed with HMAC SHA-256
            (<code className="text-xs">X-Growvisi-Signature</code>).
          </p>
        </div>
      </div>

      {newSecret && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-xs">
          <p className="font-semibold text-violet-900">Signing secret — copy now</p>
          <code className="mt-2 block break-all rounded-lg bg-card px-2 py-1.5 font-mono text-xs">
            {newSecret.secret}
          </code>
        </div>
      )}

      {isAdmin && (data?.endpoints.length ?? 0) < 3 && (
        <div className="space-y-2 rounded-xl border border-border/80 bg-background/40 p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Endpoint name"
            className="h-9 text-sm"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/growvisi"
            className="h-9 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {EVENT_OPTIONS.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => toggleEvent(ev.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  events.includes(ev.id) ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {ev.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            disabled={!url.trim() || events.length === 0 || createMut.isPending}
            isLoading={createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Add endpoint
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="space-y-2">
          {(data?.endpoints ?? []).map((ep) => (
            <li
              key={ep.id}
              className="rounded-xl border border-border/80 bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{ep.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{ep.url}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ep.events.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ep.enabled}
                    disabled={!isAdmin || (toggleMut.isPending && pendingToggle?.id === ep.id)}
                    onCheckedChange={(enabled) => toggleMut.mutate({ id: ep.id, enabled })}
                  />
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testMut.mutate(ep.id)}
                        disabled={testMut.isPending}
                        isLoading={pendingTestId === ep.id}
                      >
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteMut.isPending}
                        onClick={() => deleteMut.mutate(ep.id)}
                      >
                        {pendingDeleteId === ep.id ? (
                          <GrowvisiSpinner size="xs" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(data?.deliveries.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Recent deliveries
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {data!.deliveries.slice(0, 12).map((d) => (
              <li
                key={d.id}
                className={`flex justify-between rounded-lg px-2 py-1 ${
                  d.success ? "bg-bento-mint/40" : "bg-destructive/10"
                }`}
              >
                <span>
                  {d.event} · {formatRelative(d.deliveredAt)}
                </span>
                <span>{d.success ? d.statusCode : d.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
