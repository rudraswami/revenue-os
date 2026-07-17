"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { TemplatePreviewBubble } from "./template-preview-bubble";

export interface WhatsappTemplateOption {
  name: string;
  language: string;
  status: string;
  category?: string;
  bodyPreview: string;
  bodyVariableCount: number;
}

interface TemplatesResponse {
  templates: WhatsappTemplateOption[];
  syncedAt: string;
  count: number;
}

const CATEGORY_STYLES: Record<string, string> = {
  MARKETING: "bg-violet-100 text-violet-700",
  UTILITY: "bg-sky-100 text-sky-700",
  AUTHENTICATION: "bg-amber-100 text-amber-800",
};

function formatSyncedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function WhatsappTemplatePicker({
  templateName,
  languageCode,
  templateParam,
  onTemplateNameChange,
  onLanguageCodeChange,
  onVariableCountChange,
  disabled,
  showPreview = true,
}: {
  templateName: string;
  languageCode: string;
  templateParam?: string;
  onTemplateNameChange: (name: string) => void;
  onLanguageCodeChange: (code: string) => void;
  onVariableCountChange?: (count: number) => void;
  disabled?: boolean;
  showPreview?: boolean;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () =>
      apiFetch<TemplatesResponse>("/whatsapp-accounts/templates", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

  const templates = data?.templates ?? [];

  const selected = templates.find(
    (t) => t.name === templateName && t.language === languageCode,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.bodyPreview.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const names = [...new Set(filtered.map((t) => t.name))].sort();
  const languagesForName = templates
    .filter((t) => t.name === templateName)
    .map((t) => t.language);

  function pickTemplate(name: string) {
    const match = templates.find((t) => t.name === name);
    onTemplateNameChange(name);
    if (match) {
      onLanguageCodeChange(match.language);
      onVariableCountChange?.(match.bodyVariableCount);
    }
  }

  function pickLanguage(lang: string) {
    onLanguageCodeChange(lang);
    const match = templates.find((t) => t.name === templateName && t.language === lang);
    if (match) onVariableCountChange?.(match.bodyVariableCount);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-[#f8f9ff] px-4 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <div>
          <p className="font-medium text-foreground">Syncing templates from Meta…</p>
          <p className="text-xs">Only approved templates are shown.</p>
        </div>
      </div>
    );
  }

  if (isError || templates.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/50 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isError ? "Couldn’t load templates from Meta" : "No approved templates yet"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isError
              ? "WhatsApp connection may need attention. Fix the token, then refresh — Meta only allows approved templates for new outreach."
              : "Create a template in Meta WhatsApp Manager, wait for approval, then refresh here. Free text can’t start a new chat."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching || disabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh templates
          </button>
          <a
            href="/dashboard/connection"
            className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50"
          >
            WhatsApp connection
          </a>
        </div>
        <details className="rounded-xl border border-border/80 bg-white/80 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            Advanced: enter template name manually
          </summary>
          <div className="mt-2 space-y-2">
            <Input
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder="Exact template name from Meta"
              className="h-10 text-sm"
              disabled={disabled}
            />
            <Input
              value={languageCode}
              onChange={(e) => onLanguageCodeChange(e.target.value)}
              placeholder="Language (en)"
              className="h-10 text-sm"
              disabled={disabled}
            />
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#128C7E]" />
          <span>
            {data?.count ?? templates.length} approved
            {data?.syncedAt ? ` · synced ${formatSyncedAt(data.syncedAt)}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching || disabled}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-bento-mint/50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="h-10 pl-9 text-sm"
          disabled={disabled}
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={templateName}
          onChange={(e) => pickTemplate(e.target.value)}
          className="h-10 flex-1 text-sm"
          disabled={disabled}
        >
          <option value="">Choose template…</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {templateName && languagesForName.length > 1 && (
        <Select
          value={languageCode}
          onChange={(e) => pickLanguage(e.target.value)}
          className="h-10 text-sm"
          disabled={disabled}
        >
          {languagesForName.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </Select>
      )}

      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          {selected.category && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                CATEGORY_STYLES[selected.category] ?? "bg-muted text-muted-foreground",
              )}
            >
              {selected.category.toLowerCase()}
            </span>
          )}
          {selected.bodyVariableCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {selected.bodyVariableCount} variable
              {selected.bodyVariableCount > 1 ? "s" : ""} to fill
            </span>
          )}
        </div>
      )}

      {showPreview && selected && (
        <TemplatePreviewBubble
          body={selected.bodyPreview}
          params={templateParam?.trim() ? [templateParam.trim()] : []}
        />
      )}
    </div>
  );
}
