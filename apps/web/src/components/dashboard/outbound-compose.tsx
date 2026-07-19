"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { WhatsappTemplatePicker } from "@/components/dashboard/whatsapp-template-picker";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/** India-first dial codes for SMB outbound. Value is digits only (no +). */
const DIAL_CODES = [
  { code: "91", label: "India +91" },
  { code: "971", label: "UAE +971" },
  { code: "966", label: "Saudi +966" },
  { code: "65", label: "Singapore +65" },
  { code: "1", label: "US/CA +1" },
  { code: "44", label: "UK +44" },
  { code: "61", label: "Australia +61" },
] as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeNational(dial: string, raw: string) {
  let n = digitsOnly(raw);
  if (n.startsWith("0")) n = n.replace(/^0+/, "");
  if (n.startsWith(dial) && n.length > dial.length + 6) {
    n = n.slice(dial.length);
  }
  return n;
}

function formatPreview(dial: string, national: string) {
  const n = digitsOnly(national);
  if (!n) return `+${dial}`;
  if (dial === "91" && n.length === 10) {
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return `+${dial} ${n}`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-snug text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function OutboundCompose({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (conversationId: string) => void;
}) {
  const copy = useConversationsCopy();
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [dialCode, setDialCode] = useState<string>("91");
  const [nationalNumber, setNationalNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [templateParam, setTemplateParam] = useState("");
  const [templateVarCount, setTemplateVarCount] = useState(0);
  const [mode, setMode] = useState<"template" | "session">("template");
  const [error, setError] = useState<string | null>(null);

  const fullPhone = useMemo(
    () => `${dialCode}${digitsOnly(nationalNumber)}`,
    [dialCode, nationalNumber],
  );
  const phonePreview = formatPreview(dialCode, nationalNumber);
  const phoneReady =
    fullPhone.length >= 10 && fullPhone.length <= 15 && digitsOnly(nationalNumber).length >= 7;

  function resetForm() {
    setDialCode("91");
    setNationalNumber("");
    setDisplayName("");
    setContent("");
    setTemplateName("");
    setTemplateParam("");
    setTemplateVarCount(0);
    setMode("template");
    setLanguageCode("en");
    setError(null);
  }

  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch<{ conversation: { id: string } }>("/conversations/outbound", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          phone: fullPhone,
          displayName: displayName.trim() || undefined,
          ...(mode === "template"
            ? {
                templateName: templateName.trim(),
                languageCode,
                templateParams: templateParam.trim() ? [templateParam.trim()] : [],
              }
            : { content: content.trim() }),
        }),
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      onSent(data.conversation.id);
      onClose();
      resetForm();
    },
    onError: (e) => {
      setError(toUserMessage(e, "Could not send message."));
    },
  });

  const canSend =
    phoneReady &&
    !sendMut.isPending &&
    (mode === "template" ? Boolean(templateName.trim()) : Boolean(content.trim()));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        size="md"
        className="max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[92vh] max-sm:translate-y-0 max-sm:rounded-b-none"
      >
        <DialogHeader className="pr-12">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <MessageSquarePlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle>{copy.newOutboundTitle}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {copy.newOutboundHint}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="space-y-3">
            <Field label={copy.outboundPhoneLabel} hint={copy.outboundPhoneHint}>
              <div className="flex gap-2">
                <Select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="h-11 w-[9.5rem] shrink-0 rounded-xl text-sm"
                  aria-label="Country code"
                >
                  {DIAL_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <Input
                  value={nationalNumber}
                  onChange={(e) => setNationalNumber(normalizeNational(dialCode, e.target.value))}
                  placeholder={dialCode === "91" ? "98765 43210" : "Mobile number"}
                  inputMode="tel"
                  autoComplete="tel-national"
                  className="h-11 flex-1 rounded-xl text-sm"
                  aria-label="Phone number"
                />
              </div>
            </Field>
            {digitsOnly(nationalNumber).length > 0 && (
              <p className="text-xs font-medium tabular-nums text-muted-foreground">
                Sends to <span className="text-foreground">{phonePreview}</span>
              </p>
            )}

            <Field label={copy.outboundNameLabel}>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional"
                className="h-11 rounded-xl text-sm"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{copy.outboundMessageType}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("template")}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  mode === "template"
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                    : "border-border bg-card hover:bg-muted/40",
                )}
              >
                <p className="text-xs font-bold text-foreground">{copy.outboundModeTemplate}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {copy.outboundModeTemplateHint}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("session")}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  mode === "session"
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                    : "border-border bg-card hover:bg-muted/40",
                )}
              >
                <p className="text-xs font-bold text-foreground">{copy.outboundModeSession}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {copy.outboundModeSessionHint}
                </p>
              </button>
            </div>
          </div>

          {mode === "template" ? (
            <div className="space-y-3">
              <WhatsappTemplatePicker
                templateName={templateName}
                languageCode={languageCode}
                templateParam={templateParam}
                onTemplateNameChange={setTemplateName}
                onLanguageCodeChange={setLanguageCode}
                onVariableCountChange={setTemplateVarCount}
              />
              {templateVarCount > 0 && (
                <Field label={copy.outboundTemplateVarLabel} hint={copy.outboundTemplateVarHint}>
                  <Input
                    value={templateParam}
                    onChange={(e) => setTemplateParam(e.target.value)}
                    placeholder="Value for {{1}}"
                    className="h-11 rounded-xl text-sm"
                  />
                </Field>
              )}
            </div>
          ) : (
            <Field label={copy.outboundFreeTextLabel} hint={copy.outboundFreeTextHint}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message…"
                rows={4}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </Field>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
              {(error.toLowerCase().includes("token") ||
                error.toLowerCase().includes("template") ||
                error.toLowerCase().includes("whatsapp")) && (
                <p className="mt-1.5 text-xs">
                  <Link href="/dashboard/connection" className="font-semibold underline">
                    Open WhatsApp connection
                  </Link>
                </p>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => sendMut.mutate()} disabled={!canSend}>
            {sendMut.isPending ? (
              <>
                <GrowvisiSpinner size="xs" className="mr-2" /> Sending…
              </>
            ) : (
              "Send message"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
