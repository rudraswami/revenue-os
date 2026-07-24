"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileText } from "lucide-react";
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
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";
import { TemplateVariableChips } from "./template-variable-chips";
import { TemplateDialogBusy } from "./template-dialog-busy";
import { TEMPLATES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

type Step = "pick" | "customize";

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
  const [step, setStep] = useState<Step>("pick");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("pick");
      setShowAdvanced(false);
    }
  }, [open]);

  const selectedStarter = selectedStarterId ? starterById(selectedStarterId) : undefined;
  const previewParams = useMemo(() => {
    if (selectedStarter?.variableHints?.length) {
      return selectedStarter.variableHints.map((h) => h);
    }
    return [];
  }, [selectedStarter]);
  const bodyValidation = body.trim() ? validateTemplateBody(body) : null;
  const canSubmit =
    name.trim() && body.trim() && (bodyValidation === null || bodyValidation.ok);

  function pickStarter(starter: MessageTemplateStarter) {
    onSelectStarter(starter);
    onNameChange(defaultTemplateNameFromStarter(starter.id));
    onBodyChange(starter.body);
    onCategoryChange(starter.category);
    onLanguageChange(starter.language);
    setStep("customize");
  }

  function pickBlank() {
    onSelectStarter(null);
    const suffix = Date.now().toString(36).slice(-4);
    onNameChange(`message_${suffix}`);
    onBodyChange("");
    onCategoryChange("UTILITY");
    onLanguageChange("en");
    setStep("customize");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent size="xl" className="max-h-[min(92vh,760px)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {isPending ? <TemplateDialogBusy message={TEMPLATES.submittingToWhatsApp} /> : null}

        <DialogHeader>
          <DialogTitle>
            {step === "pick" ? TEMPLATES.createTitle : TEMPLATES.customizeTitle}
          </DialogTitle>
          <DialogDescription>
            {step === "pick" ? TEMPLATES.createPickDescription : TEMPLATES.createCustomizeDescription}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {step === "pick" ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={pickBlank}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/80 px-4 py-3 text-left transition hover:border-accent/40 hover:bg-muted/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{TEMPLATES.startBlank}</p>
                  <p className="text-xs text-muted-foreground">{TEMPLATES.startBlankHint}</p>
                </div>
              </button>

              {starters.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStarter(s)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border/80 px-4 py-3 text-left transition hover:border-accent/30 hover:bg-bento-mint/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          s.approvalHint === "fast"
                            ? "bg-whatsapp/10 text-whatsapp"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {s.approvalHint === "fast" ? TEMPLATES.fastApproval : TEMPLATES.standardApproval}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
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
                    placeholder="Hi {{1}}, thanks for contacting {{2}}…"
                  />
                  <TemplateVariableChips
                    hints={selectedStarter?.variableHints}
                    body={body}
                    onBodyChange={onBodyChange}
                  />
                  {bodyValidation && !bodyValidation.ok && (
                    <p className="text-xs text-destructive">{bodyValidation.error}</p>
                  )}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
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
                    >
                      <option value="UTILITY">{TEMPLATES.categoryUtility}</option>
                      <option value="MARKETING">{TEMPLATES.categoryMarketing}</option>
                      <option value="AUTHENTICATION">{TEMPLATES.categoryAuth}</option>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {category === "UTILITY"
                        ? TEMPLATES.categoryUtilityHint
                        : category === "MARKETING"
                          ? "Promotions and offers — may take longer to approve"
                          : "One-time passwords and verification codes"}
                    </p>
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

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {showAdvanced ? TEMPLATES.hideAdvanced : TEMPLATES.showAdvanced}
                  </button>
                  {showAdvanced && (
                    <label className="mt-2 block space-y-1.5">
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
                      <p className="text-[11px] text-muted-foreground">{TEMPLATES.templateNameHint}</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="lg:sticky lg:top-0 lg:self-start">
                <TemplatePreviewBubble body={body} params={previewParams} compact />
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="justify-between sm:justify-between">
          {step === "customize" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep("pick")}
              disabled={isPending}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {TEMPLATES.backToStarters}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step === "customize" && (
              <Button
                type="button"
                isLoading={isPending}
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                {TEMPLATES.sendForApproval}
              </Button>
            )}
          </div>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
