"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { HelpFabContext } from "@/lib/setup-help-content";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "assistant"; content: string };

export function SetupHelpChat({ context }: { context: HelpFabContext }) {
  const { t, locale } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: capabilities } = useQuery({
    queryKey: ["support-capabilities"],
    queryFn: () => apiFetch<{ setupHelpLlm: boolean }>("/support/capabilities", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 120_000,
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiFetch<{ reply: string; escalateSuggested?: boolean }>("/support/setup-help", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          context,
          message,
          locale: locale as Locale,
          history: turns.slice(-6),
        }),
      }),
    onSuccess: (data, message) => {
      setTurns((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: data.reply },
      ]);
      setInput("");
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    },
  });

  if (!capabilities?.setupHelpLlm) {
    return (
      <div className="border-b border-border/60 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">{t("setupHelp.chatOffline")}</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || chatMutation.isPending) return;
    chatMutation.mutate(message);
  }

  return (
    <div className="flex flex-col border-b border-border/60">
      <div ref={scrollRef} className="max-h-[min(40vh,280px)] overflow-y-auto custom-scrollbar px-4 py-3">
        {turns.length === 0 ? (
          <div className="rounded-xl bg-[#ecfdf5]/50 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              {t("setupHelp.chatIntroTitle")}
            </div>
            {t("setupHelp.chatIntroBody")}
            <ul className="mt-2 list-inside list-disc space-y-0.5">
              <li>{t("setupHelp.chatExample1")}</li>
              <li>{t("setupHelp.chatExample2")}</li>
              <li>{t("setupHelp.chatExample3")}</li>
            </ul>
          </div>
        ) : (
          <ul className="space-y-3">
            {turns.map((turn, i) => (
              <li
                key={`${turn.role}-${i}`}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs leading-relaxed",
                  turn.role === "user"
                    ? "ml-6 bg-[#f1f5f9] text-foreground"
                    : "mr-2 border border-[#dce9ff] bg-white text-muted-foreground",
                )}
              >
                {turn.content}
              </li>
            ))}
            {chatMutation.isPending && (
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                {t("setupHelp.chatThinking")}
              </li>
            )}
          </ul>
        )}
        {chatMutation.isError && (
          <p className="mt-2 text-xs text-destructive">
            {chatMutation.error instanceof ApiError
              ? chatMutation.error.message
              : t("setupHelp.chatError")}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/60 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("setupHelp.chatPlaceholder")}
          maxLength={500}
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2"
          disabled={chatMutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          disabled={!input.trim() || chatMutation.isPending}
          aria-label={t("setupHelp.chatSend")}
        >
          {chatMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
