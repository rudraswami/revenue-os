"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  pricing: "Pricing",
  policy: "Policies",
  faq: "FAQs",
  product: "Products",
  about: "About",
  services: "Services",
  contact: "Contact",
};

const CATEGORY_COLORS: Record<string, string> = {
  pricing: "bg-emerald-100 text-emerald-700",
  faq: "bg-blue-100 text-blue-700",
  product: "bg-purple-100 text-purple-700",
  policy: "bg-amber-100 text-amber-700",
  about: "bg-slate-100 text-slate-700",
  services: "bg-indigo-100 text-indigo-700",
  contact: "bg-pink-100 text-pink-700",
  general: "bg-gray-100 text-gray-600",
};

interface ImportItem {
  id: string;
  pageUrl: string;
  category: string;
  title: string;
  content: string;
  confidence: number;
  status: string;
}

interface WebsiteImportData {
  id: string;
  url: string;
  status: string;
  pagesFound: number;
  pagesCrawled: number;
  itemsExtracted: number;
  itemsApproved: number;
  error: string | null;
  siteName: string | null;
  createdAt: string;
  completedAt: string | null;
  items: ImportItem[];
}

interface ImportSummary {
  id: string;
  url: string;
  status: string;
  pagesFound: number;
  pagesCrawled: number;
  itemsExtracted: number;
  itemsApproved: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  totalItems: number;
}

type Phase = "idle" | "importing" | "review";

export function WebsiteImportCard() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Fetch list of past imports
  const { data: imports } = useQuery({
    queryKey: ["website-imports"],
    queryFn: () =>
      apiFetch<ImportSummary[]>("/knowledge/imports", { token: token ?? undefined }),
    enabled: !!token,
  });

  // Fetch active import details (with items) — polls while crawling/extracting
  const { data: activeImport, refetch: refetchActive } = useQuery({
    queryKey: ["website-import", activeImportId],
    queryFn: () =>
      apiFetch<WebsiteImportData>(`/knowledge/imports/${activeImportId}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!activeImportId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "crawling" || status === "extracting") return 2000;
      return false;
    },
  });

  // Auto-transition phases based on import status
  if (activeImport) {
    if (
      (activeImport.status === "crawling" || activeImport.status === "extracting") &&
      phase !== "importing"
    ) {
      setPhase("importing");
    }
    if (activeImport.status === "review" && phase !== "review") {
      setPhase("review");
      // Auto-select high confidence items
      const highConf = activeImport.items
        .filter((i) => i.status === "pending" && i.confidence >= 0.6)
        .map((i) => i.id);
      setSelectedItems(new Set(highConf));
    }
  }

  const startMutation = useMutation({
    mutationFn: (importUrl: string) =>
      apiFetch<{ id: string }>("/knowledge/imports", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ url: importUrl }),
      }),
    onSuccess: (result) => {
      setActiveImportId(result.id);
      setPhase("importing");
      setUrl("");
      void queryClient.invalidateQueries({ queryKey: ["website-imports"] });
    },
    onError: (err) => toastError(toUserMessage(err, "Could not start import")),
  });

  const approveMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      apiFetch<{ approved: number }>(`/knowledge/imports/${activeImportId}/approve`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ itemIds }),
      }),
    onSuccess: (result) => {
      success(`${result.approved} knowledge item${result.approved === 1 ? "" : "s"} added to your AI.`);
      setSelectedItems(new Set());
      void refetchActive();
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      void queryClient.invalidateQueries({ queryKey: ["knowledge-health"] });
      void queryClient.invalidateQueries({ queryKey: ["website-imports"] });
    },
    onError: (err) => toastError(toUserMessage(err, "Could not approve items")),
  });

  const dismissMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      apiFetch(`/knowledge/imports/${activeImportId}/dismiss`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ itemIds }),
      }),
    onSuccess: () => {
      void refetchActive();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload: { itemId: string; title: string; content: string }) =>
      apiFetch(`/knowledge/imports/${activeImportId}/items/${payload.itemId}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ title: payload.title, content: payload.content }),
      }),
    onSuccess: () => {
      setEditingItem(null);
      void refetchActive();
      success("Updated.");
    },
  });

  const resyncMutation = useMutation({
    mutationFn: (importId: string) =>
      apiFetch(`/knowledge/imports/${importId}/resync`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: (_, importId) => {
      setActiveImportId(importId);
      setPhase("importing");
      void queryClient.invalidateQueries({ queryKey: ["website-imports"] });
    },
  });

  function handleStartImport() {
    if (!url.trim() || startMutation.isPending) return;
    startMutation.mutate(url.trim());
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (!activeImport) return;
    const pending = activeImport.items.filter((i) => i.status === "pending").map((i) => i.id);
    setSelectedItems(new Set(pending));
  }

  function deselectAll() {
    setSelectedItems(new Set());
  }

  const pendingItems = activeImport?.items.filter((i) => i.status === "pending") ?? [];
  const approvedItems = activeImport?.items.filter((i) => i.status === "approved") ?? [];

  // Group items by category for the review UI
  const groupedItems = pendingItems.reduce<Record<string, ImportItem[]>>((acc, item) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* URL Input */}
      {phase === "idle" && (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-gradient-to-b from-accent/[0.03] to-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Import from Website</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enter your website URL — we'll extract products, pricing, FAQs, and more for your AI to answer customer questions.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="https://yourbusiness.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartImport()}
              className="h-10 flex-1 rounded-xl text-sm"
            />
            <Button
              size="sm"
              className="h-10 rounded-xl px-5"
              disabled={!url.trim() || startMutation.isPending}
              onClick={handleStartImport}
            >
              {startMutation.isPending ? (
                <GrowvisiSpinner size="xs" />
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Scan
                </>
              )}
            </Button>
          </div>

          {/* Past imports */}
          {imports && imports.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Past imports
              </p>
              {imports.map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5 text-left transition hover:border-accent/30 hover:shadow-sm"
                  onClick={() => {
                    setActiveImportId(imp.id);
                    setPhase(
                      imp.status === "crawling" || imp.status === "extracting"
                        ? "importing"
                        : "review",
                    );
                  }}
                >
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {imp.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {imp.itemsApproved}/{imp.totalItems} items approved
                    </p>
                  </div>
                  <StatusBadge status={imp.status} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      resyncMutation.mutate(imp.id);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Crawling Progress */}
      {phase === "importing" && activeImport && (
        <div className="space-y-4 rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.04] to-card p-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {activeImport.status === "crawling"
                  ? "Scanning your website..."
                  : "Extracting knowledge..."}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeImport.status === "crawling"
                  ? `Found ${activeImport.pagesFound} page${activeImport.pagesFound === 1 ? "" : "s"} so far`
                  : `Processing ${activeImport.pagesCrawled} page${activeImport.pagesCrawled === 1 ? "" : "s"} — extracting products, pricing, FAQs...`}
              </p>
            </div>
          </div>

          {/* Visual progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span>
                {activeImport.status === "crawling"
                  ? `${activeImport.pagesCrawled} pages crawled`
                  : `${activeImport.itemsExtracted} items found`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-accent/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{
                  width:
                    activeImport.status === "crawling"
                      ? `${Math.min(90, (activeImport.pagesCrawled / Math.max(1, activeImport.pagesFound)) * 100)}%`
                      : "95%",
                }}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This usually takes 30-60 seconds
          </p>
        </div>
      )}

      {/* Error state */}
      {phase === "importing" && activeImport?.status === "failed" && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Import failed</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeImport.error ?? "Could not crawl the website. Check the URL and try again."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 rounded-xl"
            onClick={() => {
              setPhase("idle");
              setActiveImportId(null);
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Review Phase */}
      {phase === "review" && activeImport && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/[0.04] to-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                <CheckCircle2 className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {activeImport.siteName
                    ? `${activeImport.itemsExtracted} items from ${activeImport.siteName}`
                    : `${activeImport.itemsExtracted} items extracted`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {activeImport.pagesCrawled} pages scanned — review and approve what your AI should know
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-xs"
              onClick={() => {
                setPhase("idle");
                setActiveImportId(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
          </div>

          {/* Bulk actions */}
          {pendingItems.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-medium text-accent hover:underline"
                  onClick={selectedItems.size === pendingItems.length ? deselectAll : selectAll}
                >
                  {selectedItems.size === pendingItems.length ? "Deselect all" : "Select all"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedItems.size} of {pendingItems.length} selected
                </span>
              </div>
              <div className="flex gap-2">
                {selectedItems.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-lg text-xs text-destructive hover:text-destructive"
                      disabled={dismissMutation.isPending}
                      onClick={() => dismissMutation.mutate(Array.from(selectedItems))}
                    >
                      <Trash2 className="h-3 w-3" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 rounded-lg text-xs"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(Array.from(selectedItems))}
                    >
                      {approveMutation.isPending ? (
                        <GrowvisiSpinner size="xs" />
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          Approve {selectedItems.size} item{selectedItems.size === 1 ? "" : "s"}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Items grouped by category */}
          {Object.entries(groupedItems)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([category, items]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general,
                    )}
                  >
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                {items.map((item) => (
                  <ImportItemCard
                    key={item.id}
                    item={item}
                    selected={selectedItems.has(item.id)}
                    expanded={expandedItem === item.id}
                    editing={editingItem === item.id}
                    editTitle={editTitle}
                    editContent={editContent}
                    onToggleSelect={() => toggleItem(item.id)}
                    onToggleExpand={() =>
                      setExpandedItem(expandedItem === item.id ? null : item.id)
                    }
                    onStartEdit={() => {
                      setEditingItem(item.id);
                      setEditTitle(item.title);
                      setEditContent(item.content);
                    }}
                    onCancelEdit={() => setEditingItem(null)}
                    onSaveEdit={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        title: editTitle,
                        content: editContent,
                      })
                    }
                    onEditTitle={setEditTitle}
                    onEditContent={setEditContent}
                    savePending={updateItemMutation.isPending}
                    onDismiss={() => dismissMutation.mutate([item.id])}
                    onApprove={() => approveMutation.mutate([item.id])}
                  />
                ))}
              </div>
            ))}

          {/* Already approved */}
          {approvedItems.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                {approvedItems.length} item{approvedItems.length === 1 ? "" : "s"} already approved
                and indexed
              </p>
            </div>
          )}

          {/* Empty state */}
          {pendingItems.length === 0 && approvedItems.length > 0 && (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-accent" />
              <p className="text-sm font-semibold text-foreground">All done!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {approvedItems.length} knowledge items are now powering your AI assistant.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 rounded-xl"
                onClick={() => {
                  setPhase("idle");
                  setActiveImportId(null);
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "crawling":
    case "extracting":
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Scanning
        </Badge>
      );
    case "review":
      return <Badge className="bg-amber-100 text-amber-700">Review</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return (
        <Badge className="bg-accent/10 text-accent">
          <Check className="h-3 w-3" />
          Done
        </Badge>
      );
  }
}

function ImportItemCard({
  item,
  selected,
  expanded,
  editing,
  editTitle,
  editContent,
  onToggleSelect,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditTitle,
  onEditContent,
  savePending,
  onDismiss,
  onApprove,
}: {
  item: ImportItem;
  selected: boolean;
  expanded: boolean;
  editing: boolean;
  editTitle: string;
  editContent: string;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditTitle: (v: string) => void;
  onEditContent: (v: string) => void;
  savePending: boolean;
  onDismiss: () => void;
  onApprove: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition",
        selected
          ? "border-accent/40 bg-accent/[0.02] shadow-sm"
          : "border-border/60 hover:border-accent/20",
      )}
    >
      <div className="flex items-start gap-3 px-3 py-3">
        {/* Checkbox */}
        <button
          type="button"
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
            selected
              ? "border-accent bg-accent text-white"
              : "border-muted-foreground/30 hover:border-accent/50",
          )}
          onClick={onToggleSelect}
        >
          {selected && <Check className="h-3 w-3" />}
        </button>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => onEditTitle(e.target.value)}
                className="h-8 rounded-lg text-sm"
              />
              <textarea
                value={editContent}
                onChange={(e) => onEditContent(e.target.value)}
                rows={6}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 rounded-lg text-xs"
                  disabled={savePending}
                  onClick={onSaveEdit}
                >
                  {savePending ? <GrowvisiSpinner size="xs" /> : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-lg text-xs"
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <ConfidenceDot confidence={item.confidence} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {item.content.slice(0, 200)}
              </p>
              {expanded && (
                <div className="mt-2 rounded-lg bg-muted/30 p-3">
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                    {item.content}
                  </pre>
                  <a
                    href={item.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {item.pageUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50)}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleExpand}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onStartEdit}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDismiss}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-accent"
              onClick={onApprove}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8
      ? "bg-emerald-400"
      : confidence >= 0.5
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <span
      className={cn("h-2 w-2 rounded-full", color)}
      title={`${Math.round(confidence * 100)}% confidence`}
    />
  );
}
