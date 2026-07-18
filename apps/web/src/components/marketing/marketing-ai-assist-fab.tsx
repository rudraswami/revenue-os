"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, X } from "lucide-react";
import { SupportAvatar } from "@/components/marketing/support-avatar";
import { MARKETING_SUPPORT } from "@/lib/brand-copy";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { useLandingSection } from "@/hooks/use-landing-section";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };
type Locale = "en" | "hi";

const LOCALE_KEY = "growvisi-marketing-locale";
const TEASER_DELAY_MS = 2400;

function teaserForSection(section: string | null): string {
  const teasers = MARKETING_SUPPORT.fabSectionTeasers;
  if (section && section in teasers) {
    return teasers[section as keyof typeof teasers];
  }
  return teasers.default;
}

/** Marketing site — AI FAQ FAB (WhatsApp → /contact#inquiry). */
export function MarketingAiAssistFab() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const landingSection = useLandingSection(onHome);

  const [expanded, setExpanded] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [dismissedSection, setDismissedSection] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const teaserTimerRef = useRef<number | null>(null);

  const teaserText = useMemo(
    () => (onHome ? teaserForSection(landingSection) : MARKETING_SUPPORT.fabTeaser),
    [onHome, landingSection],
  );

  const scheduleTeaser = useCallback(() => {
    if (teaserTimerRef.current) window.clearTimeout(teaserTimerRef.current);
    teaserTimerRef.current = window.setTimeout(() => {
      setShowTeaser(true);
    }, TEASER_DELAY_MS);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (saved === "hi" || saved === "en") setLocale(saved);
    } catch {
      /* ignore */
    }
    scheduleTeaser();
    return () => {
      if (teaserTimerRef.current) window.clearTimeout(teaserTimerRef.current);
    };
  }, [scheduleTeaser]);

  useEffect(() => {
    if (!onHome || !landingSection || expanded) return;
    if (dismissedSection === landingSection) return;
    setShowTeaser(true);
  }, [onHome, landingSection, expanded, dismissedSection]);

  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [expanded, turns, loading]);

  const dismissTeaser = () => {
    setShowTeaser(false);
    if (onHome && landingSection) {
      setDismissedSection(landingSection);
    }
  };

  const setLocalePersist = (next: Locale) => {
    setLocale(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      setShowTeaser(false);
      if (onHome && landingSection) setDismissedSection(landingSection);
    }
  };

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || loading) return;
      setInput("");
      const userTurn: Turn = { role: "user", content: message };
      setTurns((t) => [...t, userTurn]);
      setLoading(true);
      try {
        const history = [...turns, userTurn].slice(-4).map((t) => ({
          role: t.role,
          content: t.content,
        }));
        const res = await apiFetch<{ reply: string }>("/public/marketing-help", {
          method: "POST",
          skipAuthRetry: true,
          body: JSON.stringify({
            message,
            history: history.slice(0, -1),
            locale,
            page: pathname,
            section: onHome ? landingSection : undefined,
          }),
        });
        setTurns((t) => [...t, { role: "assistant", content: res.reply }]);
      } catch (err) {
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            content: toUserMessage(err, MARKETING_SUPPORT.aiOffline),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, turns, locale, pathname, onHome, landingSection],
  );

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[45] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6 lg:bottom-6">
      <AnimatePresence mode="wait">
        {showTeaser && !expanded && (
          <motion.div
            key={teaserText}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            className="pointer-events-auto flex max-w-[210px] items-start gap-2.5 rounded-2xl border border-border bg-white px-3.5 py-3 text-left shadow-[0_12px_40px_rgb(11_28_48/0.12)]"
          >
            <button type="button" onClick={toggle} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
              <SupportAvatar size={44} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug text-muted-foreground">{teaserText}</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground">
                  {MARKETING_SUPPORT.fabTeaserCta}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={dismissTeaser}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgb(11_28_48/0.16)]"
          >
            <div className="flex items-start gap-3 border-b border-border bg-gradient-to-br from-bento-mint/50 to-white px-4 py-4">
              <SupportAvatar size={44} className="shrink-0 shadow-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{MARKETING_SUPPORT.fabGreeting}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {MARKETING_SUPPORT.fabSubtext}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-end border-b border-border/80 px-3 py-1.5">
              <div className="flex rounded-lg border border-border p-0.5">
                {(["en", "hi"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLocalePersist(id)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold",
                      locale === id ? "bg-accent text-white" : "text-muted-foreground",
                    )}
                  >
                    {id === "en" ? MARKETING_SUPPORT.localeEn : MARKETING_SUPPORT.localeHi}
                  </button>
                ))}
              </div>
            </div>

            <div ref={listRef} className="max-h-52 overflow-y-auto px-4 py-3">
              {turns.length === 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {MARKETING_SUPPORT.quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="rounded-full border border-border bg-[#f8f9ff] px-2.5 py-1 text-[11px] font-medium hover:border-accent/30"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2">
                  {turns.map((t, i) => (
                    <li
                      key={`${i}-${t.role}`}
                      className={cn(
                        "rounded-xl px-3 py-2 text-[12px] leading-relaxed",
                        t.role === "user"
                          ? "ml-6 bg-accent text-white"
                          : "mr-4 bg-[#f8f9ff] text-foreground",
                      )}
                    >
                      {t.content}
                    </li>
                  ))}
                  {loading ? (
                    <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {locale === "hi" ? "सोच रहे हैं…" : "Thinking…"}
                    </li>
                  ) : null}
                </ul>
              )}
            </div>

            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  locale === "hi"
                    ? MARKETING_SUPPORT.aiPlaceholderHi
                    : MARKETING_SUPPORT.aiPlaceholder
                }
                className="h-10 min-w-0 flex-1 rounded-xl border border-border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <div className="border-t border-border/80 bg-[#fafbff] px-4 py-2.5 text-center">
              <Link
                href="/contact#inquiry"
                onClick={() => setExpanded(false)}
                className="text-[11px] font-semibold text-[#128C7E] hover:underline"
              >
                {MARKETING_SUPPORT.fabWhatsAppLink}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "pointer-events-auto relative flex h-[3.75rem] w-[3.75rem] touch-manipulation items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          expanded
            ? "bg-foreground text-white shadow-lg ring-2 ring-foreground/20 ring-offset-2"
            : "overflow-hidden bg-white shadow-[0_8px_28px_rgb(11_158_109/0.35)] ring-[3px] ring-white",
        )}
        aria-expanded={expanded}
        aria-label={expanded ? "Close help" : "Open product assistant"}
      >
        {expanded ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <SupportAvatar size={60} variant="fab" className="h-full w-full" />
            <span
              className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-[#25D366]"
              aria-hidden
            />
          </>
        )}
      </button>
    </div>
  );
}
