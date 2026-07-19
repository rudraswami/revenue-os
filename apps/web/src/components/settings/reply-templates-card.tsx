"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { canManageTeam } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

interface ReplyTemplate {
  id: string;
  title: string;
  body: string;
}

export function ReplyTemplatesCard({ embedded = false }: { embedded?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canEdit = canManageTeam(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [editing, setEditing] = useState<ReplyTemplate[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reply-templates"],
    queryFn: () =>
      apiFetch<{ templates: ReplyTemplate[] }>("/organizations/reply-templates", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const templates = editing ?? data?.templates ?? [];

  const saveMutation = useMutation({
    mutationFn: (next: ReplyTemplate[]) =>
      apiFetch<{ templates: ReplyTemplate[] }>("/organizations/reply-templates", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ templates: next }),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["reply-templates"], res);
      setEditing(null);
      success("Quick replies saved");
    },
    onError: (e) => toastError(toUserMessage(e, "Could not save quick replies.")),
  });

  function updateTemplate(id: string, patch: Partial<ReplyTemplate>) {
    setEditing(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTemplate() {
    const next: ReplyTemplate = {
      id: `new-${Date.now()}`,
      title: "New template",
      body: "",
    };
    setEditing([...templates, next]);
  }

  function removeTemplate(id: string) {
    setEditing(templates.filter((t) => t.id !== id));
  }

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-3">
      {!embedded && (
        <div>
          <p className="text-sm font-semibold">Quick reply templates</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved per workspace — pick them in Conversations when replying.
          </p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
          <MessageSquarePlus className="mb-2 h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="text-sm font-medium text-foreground">No templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Save greetings, pricing lines, and follow-ups for one-tap use.
          </p>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl"
              onClick={addTemplate}
            >
              <Plus className="h-3.5 w-3.5" />
              Add first template
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {templates.map((t) => (
            <div key={t.id} className="space-y-2 p-4">
              <div className="flex gap-2">
                <Input
                  value={t.title}
                  onChange={(e) => updateTemplate(t.id, { title: e.target.value })}
                  placeholder="Name — e.g. Share pricing"
                  className="h-9 rounded-xl border-0 bg-muted/40 text-sm shadow-none focus-visible:ring-1"
                  readOnly={!canEdit}
                  disabled={!canEdit}
                />
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTemplate(t.id)}
                    aria-label="Remove template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <textarea
                value={t.body}
                onChange={(e) => updateTemplate(t.id, { body: e.target.value })}
                placeholder="WhatsApp message text…"
                rows={2}
                readOnly={!canEdit}
                disabled={!canEdit}
                className="w-full resize-none rounded-xl border-0 bg-muted/30 px-3 py-2 text-sm disabled:opacity-80"
              />
            </div>
          ))}
        </div>
      )}

      {canEdit && templates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addTemplate}>
            <Plus className="h-3.5 w-3.5" />
            Add template
          </Button>
          {editing && (
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(templates)}
            >
              {saveMutation.isPending ? <GrowvisiSpinner size="xs" /> : "Save"}
            </Button>
          )}
        </div>
      ) : !canEdit ? (
        <p className="text-xs text-muted-foreground">Only admins can edit templates.</p>
      ) : null}
    </div>
  );
}
