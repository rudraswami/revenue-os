"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { trackActivation } from "@/lib/activation-analytics";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

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

interface ImportItem {
  id: string;
  category: string;
  title: string;
  content: string;
  confidence: number;
  status: string;
}

interface ImportData {
  id: string;
  url: string;
  status: string;
  pagesFound: number;
  pagesCrawled: number;
  itemsExtracted: number;
  itemsApproved: number;
  error: string | null;
  siteName: string | null;
  items: ImportItem[];
}

type Phase = "input" | "scanning" | "review" | "done";

export function OnboardingKnowledge({
  onContinue,
  onSkip,
}: {
  onContinue: () => void;
  onSkip: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [importId, setImportId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: importData } = useQuery({
    queryKey: ["onboarding-import", importId],
    queryFn: () =>
      apiFetch<ImportData>(`/knowledge/imports/${importId}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!importId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "crawling" || status === "extracting") return 2000;
      return false;
    },
  });

  // Auto-transition
  if (importData) {
    if (
      (importData.status === "crawling" || importData.status === "extracting") &&
      phase !== "scanning"
    ) {
      setPhase("scanning");
    }
    if (importData.status === "review" && phase === "scanning") {
      setPhase("review");
      const highConf = importData.items
        .filter((i) => i.status === "pending" && i.confidence >= 0.5)
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
      setImportId(result.id);
      setPhase("scanning");
      trackActivation("onboarding_knowledge_scan_started");
    },
    onError: (err) => toastError(toUserMessage(err, "Could not scan website")),
  });

  const approveMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      apiFetch<{ approved: number }>(`/knowledge/imports/${importId}/approve`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ itemIds }),
      }),
    onSuccess: (result) => {
      success(`${result.approved} items added to your AI!`);
      setPhase("done");
      trackActivation("onboarding_knowledge_approved", { count: result.approved });
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
    onError: (err) => toastError(toUserMessage(err, "Could not save knowledge")),
  });

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pendingItems = importData?.items.filter((i) => i.status === "pending") ?? [];

  return (
    <div className="mx-auto max-w-lg py-10">
      {/* Phase: URL Input */}
      {phase === "input" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Globe className="h-8 w-8 text-accent" />
          </div>
          <h2 className="display-lg text-foreground">Teach your AI about your business</h2>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Enter your website URL and we'll auto-extract your products, pricing, FAQs, and more —
            so your AI can answer customer questions instantly.
          </p>

          <div className="mt-8 flex gap-2">
            <Input
              placeholder="https://yourbusiness.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url.trim() && startMutation.mutate(url.trim())}
              className="h-12 flex-1 rounded-xl text-sm"
              autoFocus
            />
            <Button
              size="lg"
              className="h-12 rounded-xl px-6"
              disabled={!url.trim() || startMutation.isPending}
              onClick={() => startMutation.mutate(url.trim())}
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

          <button
            type="button"
            className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              trackActivation("onboarding_knowledge_skipped");
              onSkip();
            }}
          >
            I'll add knowledge later
          </button>
        </motion.div>
      )}

      {/* Phase: Scanning */}
      {phase === "scanning" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease }}
          className="flex flex-col items-center py-12 text-center"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <Sparkles className="h-8 w-8 text-accent" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {importData?.status === "crawling"
              ? "Scanning your website..."
              : "Extracting knowledge..."}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {importData?.status === "crawling"
              ? `Found ${importData?.pagesFound ?? 0} pages so far`
              : `Processing ${importData?.pagesCrawled ?? 0} pages — finding products, pricing, FAQs...`}
          </p>

          <div className="mt-6 w-full max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-accent/10">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: ["10%", "90%"] }}
                transition={{ duration: 30, ease: "linear" }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Usually takes 30-60 seconds</p>
        </motion.div>
      )}

      {/* Phase: Review */}
      {phase === "review" && importData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="space-y-5"
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <CheckCircle2 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Found {importData.itemsExtracted} knowledge items
              {importData.siteName ? ` from ${importData.siteName}` : ""}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We've pre-selected the most relevant items. Review and approve them for your AI.
            </p>
          </div>

          {/* Compact item list */}
          <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-3">
            {pendingItems.map((item) => {
              const selected = selectedItems.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    selected
                      ? "border-accent/40 bg-accent/[0.03]"
                      : "border-transparent hover:bg-muted/30",
                  )}
                  onClick={() => toggleItem(item.id)}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                      selected
                        ? "border-accent bg-accent text-white"
                        : "border-muted-foreground/25",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general,
                        )}
                      >
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {item.content.slice(0, 120)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="h-12 w-full max-w-xs rounded-xl shadow-[0_8px_24px_rgb(11_28_48/0.12)]"
              disabled={selectedItems.size === 0 || approveMutation.isPending}
              onClick={() => approveMutation.mutate(Array.from(selectedItems))}
            >
              {approveMutation.isPending ? (
                <GrowvisiSpinner size="xs" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Approve {selectedItems.size} item{selectedItems.size === 1 ? "" : "s"}
                </>
              )}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                trackActivation("onboarding_knowledge_review_skipped");
                onSkip();
              }}
            >
              Skip for now — I'll review later in Settings
            </button>
          </div>
        </motion.div>
      )}

      {/* Phase: Done */}
      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease }}
          className="flex flex-col items-center py-12 text-center"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Sparkles className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Your AI is ready to help!</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Your business knowledge is now indexed. Your AI can answer customer questions about your
            products, pricing, and more.
          </p>
          <Button
            size="lg"
            className="mt-8 h-12 rounded-xl px-8 shadow-[0_8px_24px_rgb(11_28_48/0.12)]"
            onClick={onContinue}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Error state */}
      {phase === "scanning" && importData?.status === "failed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-destructive">
            {importData.error ?? "Could not scan the website. Check the URL and try again."}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 rounded-xl"
            onClick={() => {
              setPhase("input");
              setImportId(null);
            }}
          >
            Try again
          </Button>
        </motion.div>
      )}
    </div>
  );
}
