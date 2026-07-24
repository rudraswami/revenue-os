"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { HelpFabContext } from "@/lib/setup-help-content";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "assistant"; content: string };

const SUGGESTION_KEYS = ["chatExample1", "chatExample2", "chatExample3"] as const;

type SetupHelpChatProps = {
  context: HelpFabContext;
  layout?: "compact" | "page";
};

export function SetupHelpChat({ context, layout = "compact" }: SetupHelpChatProps) {
  const { t, locale } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPage = layout === "page";

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

  function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate(trimmed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        isPage ? "h-full min-h-[min(520px,72vh)]" : "border-b border-border/60",
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain custom-scrollbar",
          isPage ? "px-5 py-5" : "max-h-[min(40vh,280px)] px-4 py-3",
        )}
      >
        {turns.length === 0 ? (
          <div className={cn(isPage ? "max-w-lg" : "")}>
            <div
              className={cn(
                "rounded-2xl border border-accent/20 bg-gradient-to-br from-bento-mint/80 to-card",
                isPage ? "px-5 py-5" : "rounded-xl px-3 py-3",
              )}
            >
              <div
                className={cn(
                  "mb-2 flex items-center gap-2 font-semibold text-accent",
                  isPage ? "text-sm" : "text-xs",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                {t("setupHelp.chatIntroTitle")}
              </div>
              <p className={cn("leading-relaxed text-muted-foreground", isPage ? "text-sm" : "text-xs")}>
                {t("setupHelp.chatIntroBody")}
              </p>
              <div className={cn("mt-4 flex flex-wrap gap-2", !isPage && "mt-2")}>
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => sendMessage(t(`setupHelp.${key}`))}
                    disabled={chatMutation.isPending}
                    className={cn(
                      "rounded-full border border-border bg-card text-left font-medium text-foreground transition hover:border-accent/30 hover:bg-bento-mint/50 disabled:opacity-50",
                      isPage ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
                    )}
                  >
                    {t(`setupHelp.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ul className={cn("space-y-4", isPage && "mx-auto max-w-2xl")}>
            {turns.map((turn, i) => (
              <li
                key={`${turn.role}-${i}`}
                className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start gap-2")}
              >
                {turn.role === "assistant" && (
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bento-mint text-accent">
                    <Sparkles className="h-4 w-4" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[min(100%,28rem)] leading-relaxed",
                    isPage ? "text-sm" : "text-xs",
                    turn.role === "user"
                      ? "rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-white"
                      : "rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-foreground shadow-sm",
                  )}
                >
                  {turn.content}
                </div>
              </li>
            ))}
            {chatMutation.isPending && (
              <li className="flex items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bento-mint text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
                <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  {t("setupHelp.chatThinking")}
                </div>
              </li>
            )}
          </ul>
        )}
        {chatMutation.isError && (
          <p className={cn("mt-3 text-destructive", isPage ? "text-sm" : "text-xs")}>
            {toUserMessage(chatMutation.error, t("setupHelp.chatError"))}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn(
          "shrink-0 border-t border-border/80 bg-background/80 backdrop-blur-sm",
          isPage ? "px-5 py-4" : "flex gap-2 p-3",
        )}
      >
        <div className={cn(isPage ? "mx-auto flex w-full max-w-2xl gap-3" : "flex w-full gap-2")}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={t("setupHelp.chatPlaceholder")}
            maxLength={500}
            rows={isPage ? 2 : 1}
            className={cn(
              "min-w-0 flex-1 resize-none touch-manipulation rounded-xl border border-border bg-card outline-none ring-accent/30 focus:ring-2",
              isPage ? "px-4 py-3 text-sm" : "px-3 py-2 text-sm",
            )}
            disabled={chatMutation.isPending}
          />
          <Button
            type="submit"
            size={isPage ? "default" : "icon"}
            className={cn("shrink-0 rounded-xl", isPage ? "h-auto self-end px-4" : "h-10 w-10")}
            disabled={!input.trim() || chatMutation.isPending}
            aria-label={t("setupHelp.chatSend")}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isPage ? <span className="ml-2 hidden sm:inline">{t("setupHelp.chatSend")}</span> : null}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
