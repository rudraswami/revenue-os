"use client";

import { useMemo } from "react";
import type { MessageTemplateStarter } from "@growvisi/shared";
import {
  defaultTemplateNameFromStarter,
  sanitizeTemplateName,
  starterById,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";
import { TEMPLATES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export function TemplateCreateDialog({
  open,
  onOpenChange,
  starters,
  selectedStarterId,
  onSelectStarter,
  name,
  onNameChange,
  body,
  onBodyChange,
  category,
  onCategoryChange,
  language,
  onLanguageChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starters: MessageTemplateStarter[];
  selectedStarterId: string | null;
  onSelectStarter: (starter: MessageTemplateStarter | null) => void;
  name: string;
  onNameChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  onCategoryChange: (value: "MARKETING" | "UTILITY" | "AUTHENTICATION") => void;
  language: string;
  onLanguageChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const selectedStarter = selectedStarterId ? starterById(selectedStarterId) : undefined;
  const previewParams = useMemo(() => {
    if (!selectedStarter) return [];
    return selectedStarter.variableHints.map((h) => `[${h}]`);
  }, [selectedStarter]);
  const bodyValidation = body.trim() ? validateTemplateBody(body) : null;
  const canSubmit =
    name.trim() &&
    body.trim() &&
    (bodyValidation === null || bodyValidation.ok);

  function pickStarter(starter: MessageTemplateStarter) {
    onSelectStarter(starter);
    onNameChange(defaultTemplateNameFromStarter(starter.id));
    onBodyChange(starter.body);
    onCategoryChange(starter.category);
    onLanguageChange(starter.language);
  }

  function pickBlank() {
    onSelectStarter(null);
    onNameChange("");
    onBodyChange("");
    onCategoryChange("UTILITY");
    onLanguageChange("en");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[min(90vh,720px)]">
        <DialogHeader>
          <DialogTitle>{TEMPLATES.createTitle}</DialogTitle>
          <DialogDescription>{TEMPLATES.createDescription}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {starters.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{TEMPLATES.startersLabel}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pickBlank}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm transition",
                    selectedStarterId === null && body === "" && name === ""
                      ? "border-accent/40 bg-accent/5 text-foreground"
                      : "border-border/80 bg-card hover:border-accent/30 hover:bg-muted/40",
                  )}
                >
                  {TEMPLATES.startBlank}
                </button>
                {starters.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickStarter(s)}
                    className={cn(
                      "max-w-[200px] rounded-xl border px-3 py-2 text-left text-sm transition",
                      selectedStarterId === s.id
                        ? "border-accent/40 bg-accent/5 text-foreground"
                        : "border-border/80 bg-card hover:border-accent/30 hover:bg-muted/40",
                    )}
                  >
                    <span className="font-medium">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {TEMPLATES.templateName}
                </span>
                <Input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  onBlur={() => onNameChange(sanitizeTemplateName(name))}
                  placeholder={TEMPLATES.templateNamePlaceholder}
                  className="h-10 text-sm"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
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
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {TEMPLATES.language}
                  </span>
                  <Select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    className="h-10 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="en_IN">English (India)</option>
                    <option value="hi">Hindi</option>
                  </Select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {TEMPLATES.messageBody}
                </span>
                <Textarea
                  value={body}
                  onChange={(e) => onBodyChange(e.target.value)}
                  rows={5}
                  className="text-sm"
                  placeholder="Hi {{1}}, thanks for contacting {{2}}…"
                />
                {bodyValidation && !bodyValidation.ok && (
                  <p className="text-xs text-destructive">{bodyValidation.error}</p>
                )}
                <p className="text-xs text-muted-foreground">{TEMPLATES.bodyHint}</p>
              </label>
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
            {TEMPLATES.sendForApproval}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
