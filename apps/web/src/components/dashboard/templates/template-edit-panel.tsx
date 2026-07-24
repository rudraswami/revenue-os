"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import type { MessageTemplateView } from "@growvisi/shared";
import {
  canEditTemplateCategory,
  templateEditHint,
  validateTemplateBody,
} from "@growvisi/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";

export function TemplateEditPanel({
  template,
  body,
  category,
  onBodyChange,
  onCategoryChange,
  onCancel,
  onSubmit,
  isPending,
}: {
  template: MessageTemplateView;
  body: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  onBodyChange: (value: string) => void;
  onCategoryChange: (value: "MARKETING" | "UTILITY" | "AUTHENTICATION") => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const bodyValidation = body.trim() ? validateTemplateBody(body) : null;
  const categoryEditable = canEditTemplateCategory(template.status);
  const hint = templateEditHint(template.status);

  const previewParams = useMemo(() => {
    const count = template.bodyVariableCount || 0;
    return Array.from({ length: count }, (_, i) => `[Variable ${i + 1}]`);
  }, [template.bodyVariableCount]);

  return (
    <section className="overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-bento-mint/40 via-card to-card elev-1">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-lg font-bold text-foreground">Edit template</h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {template.name} · {template.language}
        </p>
        {hint && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{hint}</p>}
        {template.rejectedReason && (
          <p className="mt-2 text-xs text-destructive">Meta reason: {template.rejectedReason}</p>
        )}
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Message body</span>
            <Textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={5}
              className="text-sm"
            />
            {bodyValidation && !bodyValidation.ok && (
              <p className="text-xs text-destructive">{bodyValidation.error}</p>
            )}
          </label>

          {categoryEditable && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Category</span>
              <Select
                value={category}
                onChange={(e) =>
                  onCategoryChange(e.target.value as "MARKETING" | "UTILITY" | "AUTHENTICATION")
                }
                className="h-10 text-sm"
              >
                <option value="UTILITY">Utility (faster approval)</option>
                <option value="MARKETING">Marketing</option>
                <option value="AUTHENTICATION">Authentication</option>
              </Select>
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={
                isPending ||
                !body.trim() ||
                (bodyValidation !== null && !bodyValidation.ok)
              }
              onClick={onSubmit}
            >
              {isPending ? (
                <GrowvisiSpinner size="sm" className="mr-2" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Save to WhatsApp
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>

        <TemplatePreviewBubble body={body} params={previewParams} />
      </div>
    </section>
  );
}
