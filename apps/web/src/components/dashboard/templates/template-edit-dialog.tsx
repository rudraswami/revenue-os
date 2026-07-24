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
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";
import { TemplateVariableChips } from "./template-variable-chips";
import { TemplateDialogBusy } from "./template-dialog-busy";
import {
  displayTemplateLanguage,
  displayTemplateName,
  formatTemplateRejectionReason,
  humanizeTemplateRejectionReason,
} from "./template-utils";
import { TEMPLATES } from "@/lib/brand-copy";

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
  const rejection =
    template?.status === "REJECTED"
      ? formatTemplateRejectionReason(template.rejectedReason)
      : null;

  const previewParams = useMemo(() => {
    const count = template?.bodyVariableCount || 0;
    return Array.from({ length: count }, (_, i) => `Variable ${i + 1}`);
  }, [template?.bodyVariableCount]);

  if (!template) return null;

  const canSubmit = body.trim() && (bodyValidation === null || bodyValidation.ok);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent size="lg" className="max-h-[min(92vh,680px)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {isPending ? <TemplateDialogBusy message={TEMPLATES.submittingToWhatsApp} /> : null}

        <DialogHeader>
          <DialogTitle>{TEMPLATES.editTitle}</DialogTitle>
          <DialogDescription>
            {displayTemplateName(template.name)} · {displayTemplateLanguage(template.language)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {hint && <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>}
          {rejection && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-relaxed text-destructive">
              {humanizeTemplateRejectionReason(rejection)}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {TEMPLATES.messageBody}
                </span>
                <Textarea
                  value={body}
                  onChange={(e) => onBodyChange(e.target.value)}
                  rows={6}
                  className="text-sm leading-relaxed"
                  disabled={isPending}
                />
                <TemplateVariableChips body={body} onBodyChange={onBodyChange} />
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
                      onCategoryChange(
                        e.target.value as "MARKETING" | "UTILITY" | "AUTHENTICATION",
                      )
                    }
                    className="h-10 text-sm"
                    disabled={isPending}
                  >
                    <option value="UTILITY">{TEMPLATES.categoryUtility}</option>
                    <option value="MARKETING">{TEMPLATES.categoryMarketing}</option>
                    <option value="AUTHENTICATION">{TEMPLATES.categoryAuth}</option>
                  </Select>
                </label>
              )}
            </div>

            <div className="lg:sticky lg:top-0 lg:self-start">
              <TemplatePreviewBubble body={body} params={previewParams} compact />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {TEMPLATES.saveChanges}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
