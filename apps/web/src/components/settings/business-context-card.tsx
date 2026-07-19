"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiUpload, toUserMessage } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_MAX_CONTENT_CHARS,
  KNOWLEDGE_UPLOAD_EXTENSIONS,
} from "@growvisi/shared";
import { useAuthStore } from "@/stores/auth-store";
import { useMutationPendingId } from "@/hooks/use-mutation-pending-id";
import { cn } from "@/lib/utils";

const ACCEPT_UPLOAD = KNOWLEDGE_UPLOAD_EXTENSIONS.join(",");

const SUGGESTIONS = ["Pricing", "Policy", "FAQs", "Catalog"] as const;

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

type AddMode = "upload" | "paste";

export function BusinessContextCard({ embedded = false }: { embedded?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addMode, setAddMode] = useState<AddMode>("upload");
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
      success(doc.truncated ? "Uploaded — trimmed to 20k chars." : "Uploaded — indexing started.");
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
      success("Document indexed.");
    },
    onError: (err) => toastError(toUserMessage(err, "Could not save document.")),
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
      success("Updated.");
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

  function handleUploadFile(file: File) {
    if (!canManage || uploadMutation.isPending) return;
    uploadMutation.mutate(file);
  }

  const pendingReindexId = useMutationPendingId(reindexMutation);
  const pendingDeleteId = useMutationPendingId(deleteMutation);

  function startEdit(doc: KnowledgeDoc) {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.rawContent ?? "");
  }

  const categorySelect = (
    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className="h-9 w-full rounded-xl border border-input bg-card px-3 text-sm"
    >
      {KNOWLEDGE_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABELS[c] ?? c}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              aria-label="Add knowledge"
              value={addMode}
              onChange={setAddMode}
              options={[
                { value: "upload", label: "Upload file" },
                { value: "paste", label: "Paste text" },
              ]}
            />
            {!embedded ? null : (
              <p className="text-[11px] text-muted-foreground">PDF · DOCX · TXT · 4 MB max</p>
            )}
          </div>

          <Input
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 rounded-xl text-sm"
          />
          {categorySelect}

          {addMode === "upload" ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
                dragActive
                  ? "border-accent bg-bento-mint/40"
                  : "border-accent/25 bg-gradient-to-b from-bento-mint/20 to-card hover:border-accent/40",
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
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-accent/20">
                <FileUp className="h-6 w-6 text-accent" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">Drop file here</p>
              <p className="mt-1 text-xs text-muted-foreground">or choose from your computer</p>
              <Button
                type="button"
                size="sm"
                className="mt-4 rounded-xl"
                disabled={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Browse files"
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
          ) : (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, KNOWLEDGE_MAX_CONTENT_CHARS))}
                placeholder="Paste pricing, policies, or FAQs…"
                rows={5}
                className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
              />
              <div className="flex justify-end">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {content.length.toLocaleString("en-IN")} /{" "}
                  {KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString("en-IN")}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full rounded-xl sm:w-auto"
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
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : (docs?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          {canManage && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {docs!.map((doc) => (
            <li
              key={doc.id}
              className="group rounded-xl border border-border/70 bg-card px-3 py-3 transition hover:border-accent/25 hover:shadow-sm sm:px-4"
            >
              {editingId === doc.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-9 rounded-xl text-sm"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl"
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
                        "Save"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bento-mint/80 text-accent">
                    <FileText className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{doc.title}</p>
                      {doc.category && doc.category !== "general" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABELS[doc.category] ?? doc.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {doc.sourceType === "upload" && doc.sourceUrl
                        ? doc.sourceUrl
                        : doc.rawContent?.slice(0, 80)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline",
                      doc.status === "indexed"
                        ? "bg-bento-mint text-accent"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {doc.status === "indexed" ? `${doc.chunkCount ?? 0} chunks` : doc.status}
                  </span>
                  {canManage && (
                    <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(doc)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={reindexMutation.isPending}
                        onClick={() => reindexMutation.mutate(doc.id)}
                      >
                        {pendingReindexId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(doc.id)}
                        aria-label="Delete"
                      >
                        {pendingDeleteId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
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
