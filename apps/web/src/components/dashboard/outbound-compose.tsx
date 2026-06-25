"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export function OutboundCompose({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (conversationId: string) => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [templateParam, setTemplateParam] = useState("");
  const [mode, setMode] = useState<"template" | "text">("template");
  const [error, setError] = useState<string | null>(null);

  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch<{ conversation: { id: string } }>("/conversations/outbound", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          phone: phone.trim(),
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
      setPhone("");
      setDisplayName("");
      setContent("");
      setTemplateName("");
      setTemplateParam("");
      setError(null);
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not send message.");
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-bold">New outbound message</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          New numbers require a Meta-approved template. Existing threads within 24h can use free text.
        </p>

        <div className="mt-4 space-y-3">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone with country code (919876543210)"
            className="h-10"
          />
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Contact name (optional)"
            className="h-10"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "template" ? "default" : "outline"}
              onClick={() => setMode("template")}
            >
              Template
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "text" ? "default" : "outline"}
              onClick={() => setMode("text")}
            >
              Free text (24h window)
            </Button>
          </div>

          {mode === "template" ? (
            <>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Approved template name"
                className="h-10"
              />
              <Input
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                placeholder="Language code (en)"
                className="h-10"
              />
              <Input
                value={templateParam}
                onChange={(e) => setTemplateParam(e.target.value)}
                placeholder="Template body variable {{1}} (optional)"
                className="h-10"
              />
            </>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your message…"
              className="min-h-[100px] w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          )}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => sendMut.mutate()}
            disabled={
              sendMut.isPending ||
              !phone.trim() ||
              (mode === "template" ? !templateName.trim() : !content.trim())
            }
          >
            {sendMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              "Send message"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
