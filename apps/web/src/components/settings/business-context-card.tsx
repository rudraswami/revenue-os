"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiUpload, toUserMessage } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_MAX_CONTENT_CHARS, KNOWLEDGE_UPLOAD_EXTENSIONS } from "@growvisi/shared";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const ACCEPT_UPLOAD = KNOWLEDGE_UPLOAD_EXTENSIONS.join(",");

const EMPTY_STATE_SUGGESTIONS = [
  "Rate card or price list",
  "Delivery & refund policy",
  "Common FAQs",
  "Product / service catalog",
] as const;

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
  sourceUrl?: string | null;
  status: string;
  updatedAt: string;
  chunkCount?: number;
}

export function BusinessContextCard({ embedded = false }: { embedded?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
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

  const invalidateKnowledge = () => {
    void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    void queryClient.invalidateQueries({ queryKey: ["knowledge-health"] });
  };

  const uploadMutation = useMutation({
    mutationFn: (uploadFile: File) => {
      const form = new FormData();
      form.append("file", uploadFile);
      if (title.trim()) form.append("title", title.trim());
      form.append("category", category);
      return apiUpload<KnowledgeDoc & { truncated?: boolean }>("/knowledge/documents/upload", form, {
        token: token ?? undefined,
      });
    },
    onSuccess: (doc) => {
      setTitle("");
      invalidateKnowledge();
      success(
        doc.truncated
          ? "File uploaded — text was trimmed to the 20,000 character limit before indexing."
          : "File uploaded and queued for indexing.",
      );
    },
    onError: (err) => toastError(toUserMessage(err, "Could not upload file.")),
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
      invalidateKnowledge();
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
      invalidateKnowledge();
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/knowledge/documents/${id}/reindex`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: invalidateKnowledge,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/knowledge/documents/${id}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: invalidateKnowledge,
  });

  const indexedTotal = (docs ?? []).reduce((n, d) => n + (d.chunkCount ?? 0), 0);

  function handleUploadFile(file: File) {
    if (!canManage || uploadMutation.isPending) return;
    uploadMutation.mutate(file);
  }

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
            {indexedTotal} chunks indexed — used for drafts and guarded auto-send
          </span>
        </p>
      )}

      {canManage && (
        <div className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-3">
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition",
              dragActive
                ? "border-accent bg-bento-mint/30"
                : "border-border/70 bg-card/50 hover:border-accent/30 hover:bg-bento-mint/10",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleUploadFile(file);
            }}
          >
            <FileUp className="mb-2 h-8 w-8 text-accent" aria-hidden />
            <p className="text-sm font-medium text-foreground">Upload PDF, DOCX, or text file</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to 4 MB · extracted text is indexed for drafts and guarded auto-send
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Choose file"
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_UPLOAD}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            or paste text
          </p>

          <Input
            placeholder="Title — e.g. 2BHK interior pricing"
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
            onChange={(e) => setContent(e.target.value.slice(0, KNOWLEDGE_MAX_CONTENT_CHARS))}
            placeholder="Paste product details, offers, or policies your sales team should know…"
            rows={embedded ? 5 : 3}
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Paste or upload — up to {KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString("en-IN")} characters per doc.
            </p>
            <p
              className={`text-[11px] tabular-nums ${
                content.length > KNOWLEDGE_MAX_CONTENT_CHARS * 0.9
                  ? "text-amber-700"
                  : "text-muted-foreground"
              }`}
            >
              {content.length.toLocaleString("en-IN")} /{" "}
              {KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString("en-IN")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={
              !title.trim() ||
              !content.trim() ||
              content.length > KNOWLEDGE_MAX_CONTENT_CHARS ||
              createMutation.isPending
            }
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
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5">
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {canManage
              ? "Start with the docs your team quotes from most often. Growvisi indexes them within a few seconds."
              : "No business knowledge documents in this workspace yet."}
          </p>
          {canManage && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {EMPTY_STATE_SUGGESTIONS.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
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
                      {doc.sourceType === "upload" && doc.sourceUrl ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {doc.sourceUrl}
                        </span>
                      ) : null}
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
