"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { QUERY_KEYS } from "@/lib/query-config";
import { useAuthStore } from "@/stores/auth-store";

export interface LeadNoteRow {
  id: string;
  body: string;
  createdAt: string;
  author?: { id: string; name?: string | null; email: string } | null;
}

export function InboxInternalNotes({
  leadId,
  canEdit,
  canDeleteAny = false,
}: {
  leadId: string;
  canEdit: boolean;
  canDeleteAny?: boolean;
}) {
  const copy = useConversationsCopy();
  const token = useAuthStore((s) => s.accessToken);
  const myUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: notes, isLoading } = useQuery({
    queryKey: QUERY_KEYS.leadNotes(leadId),
    queryFn: () =>
      apiFetch<LeadNoteRow[]>(`/leads/${leadId}/notes`, { token: token ?? undefined }),
    enabled: !!token && !!leadId,
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (text: string) =>
      apiFetch<LeadNoteRow>(`/leads/${leadId}/notes`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ body: text }),
      }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadNotes(leadId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadTimeline(leadId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) =>
      apiFetch(`/leads/${leadId}/notes/${noteId}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadNotes(leadId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadTimeline(leadId) });
    },
  });

  return (
    <div className="border-t border-border/50 pt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{copy.internalNotesTitle}</p>
      <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
        {copy.internalNotesHint}
      </p>

      {canEdit && (
        <form
          className="mb-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = body.trim();
            if (!text || addMutation.isPending) return;
            addMutation.mutate(text);
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder={copy.internalNotesPlaceholder}
            className="w-full resize-none rounded-lg border border-border/80 bg-background px-2.5 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <Button
            type="submit"
            size="xs"
            className="h-7 rounded-lg text-xs"
            disabled={!body.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? copy.internalNotesSaving : copy.internalNotesAdd}
          </Button>
        </form>
      )}

      {isLoading && (
        <p className="text-xs text-muted-foreground">{copy.internalNotesLoading}</p>
      )}

      {!isLoading && (notes?.length ?? 0) === 0 && (
        <p className="text-xs text-muted-foreground">{copy.internalNotesEmpty}</p>
      )}

      <ul className="max-h-36 space-y-2 overflow-y-auto">
        {(notes ?? []).map((note) => (
          <li
            key={note.id}
            className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{note.body}</p>
              {canEdit && (note.author?.id === myUserId || canDeleteAny) && (
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label={copy.internalNotesDelete}
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {note.author?.name ?? note.author?.email ?? "Team"} ·{" "}
              {new Date(note.createdAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
