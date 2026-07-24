"use client";

import { useMemo } from "react";
import type { MessageTemplateView } from "@growvisi/shared";
import {
  canEditTemplateCategory,
  templateEditHint,
  validateTemplateBody,
} from "@growvisi/shared";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";
import { TEMPLATES } from "@/lib/brand-copy";

function displayTemplateName(name: string): string {
  return name.replace(/_/g, " ");
}

export function TemplateEditDialog({
  template,
  open,
  onOpenChange,
  body,
  onBodyChange,
  category,
  onCategoryChange,
  onSubmit,
  isPending,
}: {
  template: MessageTemplateView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  body: string;
  onBodyChange: (value: string) => void;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  onCategoryChange: (value: "MARKETING" | "UTILITY" | "AUTHENTICATION") => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const bodyValidation = body.trim() ? validateTemplateBody(body) : null;
  const categoryEditable = template ? canEditTemplateCategory(template.status) : false;
  const hint = template ? templateEditHint(template.status) : null;

  const previewParams = useMemo(() => {
    const count = template?.bodyVariableCount || 0;
    return Array.from({ length: count }, (_, i) => `[Variable ${i + 1}]`);
  }, [template?.bodyVariableCount]);

  if (!template) return null;

  const canSubmit =
    body.trim() && (bodyValidation === null || bodyValidation.ok);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[min(90vh,640px)]">
        <DialogHeader>
          <DialogTitle>{TEMPLATES.editTitle}</DialogTitle>
          <DialogDescription>
            {displayTemplateName(template.name)} · {template.language}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {hint && <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>}
          {template.rejectedReason && (
            <p className="text-sm text-destructive">
              {TEMPLATES.rejectedReason(template.rejectedReason)}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {TEMPLATES.messageBody}
                </span>
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
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {TEMPLATES.category}
                  </span>
                  <Select
                    value={category}
                    onChange={(e) =>
                      onCategoryChange(e.target.value as "MARKETING" | "UTILITY" | "AUTHENTICATION")
                    }
                    className="h-10 text-sm"
                  >
                    <option value="UTILITY">{TEMPLATES.categoryUtility}</option>
                    <option value="MARKETING">{TEMPLATES.categoryMarketing}</option>
                    <option value="AUTHENTICATION">{TEMPLATES.categoryAuth}</option>
                  </Select>
                </label>
              )}
            </div>

            <TemplatePreviewBubble body={body} params={previewParams} />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending || !canSubmit} onClick={onSubmit}>
            {isPending ? <GrowvisiSpinner size="sm" className="mr-2" /> : null}
            {TEMPLATES.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
