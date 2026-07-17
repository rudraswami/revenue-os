"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
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
    },
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

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-border/80 bg-background/40 p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={t.title}
                  onChange={(e) => updateTemplate(t.id, { title: e.target.value })}
                  placeholder="Template name"
                  className="h-8 text-sm"
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
                placeholder="Message text…"
                rows={2}
                readOnly={!canEdit}
                disabled={!canEdit}
                className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm disabled:opacity-80"
              />
            </div>
          ))}
        </div>
      )}

      {canEdit ? (
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
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save templates"}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only workspace admins can edit quick reply templates.
        </p>
      )}
    </div>
  );
}
