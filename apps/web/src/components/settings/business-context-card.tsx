"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface KnowledgeDoc {
  id: string;
  title: string;
  rawContent: string | null;
  sourceType: string;
  status: string;
  updatedAt: string;
}

export function BusinessContextCard() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: () => apiFetch<KnowledgeDoc[]>("/knowledge/documents", { token: token ?? undefined }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<KnowledgeDoc>("/knowledge/documents", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ title, content }),
      }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/knowledge/documents/${id}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Business context</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pricing, policies, and FAQs your team references — stored per workspace. AI classification
            uses conversation text; semantic search ships next.
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/80 bg-[#f8f9ff]/40 p-3">
        <Input
          placeholder="Title — e.g. Pricing sheet"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-sm"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste product details, offers, or policies your sales team should know…"
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-white px-3 py-2 text-sm"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          disabled={!title.trim() || !content.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add document
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : (docs?.length ?? 0) === 0 ? (
        <p className="text-xs text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs!.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{doc.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.rawContent}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(doc.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
