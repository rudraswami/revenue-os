"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { KNOWLEDGE_CATEGORIES } from "@growvisi/shared";
import { useAuthStore } from "@/stores/auth-store";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  pricing: "Pricing",
  policy: "Policy",
  faq: "FAQ",
  product: "Product",
};

interface KnowledgeDoc {
  id: string;
  title: string;
  category?: string;
  rawContent: string | null;
  sourceType: string;
  status: string;
  updatedAt: string;
  chunkCount?: number;
}

export function BusinessContextCard({ embedded = false }: { embedded?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

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
        body: JSON.stringify({ title, content, category }),
      }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; title: string; content: string }) =>
      apiFetch<KnowledgeDoc>(`/knowledge/documents/${payload.id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ title: payload.title, content: payload.content }),
      }),
    onSuccess: () => {
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/knowledge/documents/${id}/reindex`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/knowledge/documents/${id}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] }),
  });

  const indexedTotal = (docs ?? []).reduce((n, d) => n + (d.chunkCount ?? 0), 0);

  function startEdit(doc: KnowledgeDoc) {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.rawContent ?? "");
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bento-mint text-accent">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Business context</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pricing, policies, and FAQs — powers classification, handoff decisions, and reply drafts.
              {indexedTotal > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 font-medium text-accent">
                  <Sparkles className="h-3 w-3" />
                  {indexedTotal} chunks indexed
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {embedded && indexedTotal > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            <Sparkles className="h-3 w-3" />
            {indexedTotal} chunks indexed for AI reply drafts
          </span>
        </p>
      )}

      {canManage && (
        <div className="space-y-2 rounded-xl border border-border/80 bg-background/40 p-3">
          <Input
            placeholder="Title — e.g. Pricing sheet"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm"
          >
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste product details, offers, or policies your sales team should know…"
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
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
                Add & index
              </>
            )}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : (docs?.length ?? 0) === 0 ? (
        <p className="text-xs text-muted-foreground">
          {canManage ? "No documents yet." : "No business context documents in this workspace."}
        </p>
      ) : (
        <ul className="space-y-2">
          {docs!.map((doc) => (
            <li
              key={doc.id}
              className="rounded-xl border border-border/80 bg-card px-4 py-3"
            >
              {editingId === doc.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!editTitle.trim() || !editContent.trim() || updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          id: doc.id,
                          title: editTitle,
                          content: editContent,
                        })
                      }
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save & re-index"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{doc.title}</p>
                      {doc.category && doc.category !== "general" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {CATEGORY_LABELS[doc.category] ?? doc.category}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          doc.status === "indexed"
                            ? "bg-bento-mint text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {doc.status === "indexed"
                          ? `${doc.chunkCount ?? 0} chunks`
                          : doc.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.rawContent}</p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => startEdit(doc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Re-index"
                        disabled={reindexMutation.isPending}
                        onClick={() => reindexMutation.mutate(doc.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(doc.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
