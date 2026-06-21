"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  from: "customer" | "business" | "ai";
  text: string;
  time?: string;
  link?: { title: string; subtitle: string };
};

function TypingIndicator({ align }: { align: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("flex", align === "right" ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-2xl px-4 py-3",
          align === "right" ? "rounded-br-md bg-whatsapp-green" : "rounded-bl-md bg-white shadow-sm",
        )}
      >
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
      </div>
    </motion.div>
  );
}

export function useAnimatedChat(messages: ChatMessage[], { loop = true, paused = false } = {}) {
  const [visible, setVisible] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<"customer" | "business" | "ai" | null>(null);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (paused) return;

    function scheduleNext() {
      if (indexRef.current >= messages.length) {
        if (loop) {
          timeoutRef.current = setTimeout(() => {
            indexRef.current = 0;
            setVisible([]);
            scheduleNext();
          }, 3000);
        }
        return;
      }

      const msg = messages[indexRef.current];
      const isReply = msg.from !== "customer";

      if (isReply) {
        setTyping(msg.from);
        timeoutRef.current = setTimeout(() => {
          setTyping(null);
          setVisible((v) => [...v, msg]);
          indexRef.current += 1;
          timeoutRef.current = setTimeout(scheduleNext, msg.from === "ai" ? 1800 : 1400);
        }, 1200);
      } else {
        setVisible((v) => [...v, msg]);
        indexRef.current += 1;
        timeoutRef.current = setTimeout(scheduleNext, 900);
      }
    }

    timeoutRef.current = setTimeout(scheduleNext, 600);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [messages, loop, paused]);

  useEffect(() => {
    if (paused) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [paused]);

  function reset() {
    indexRef.current = 0;
    setVisible([]);
    setTyping(null);
  }

  return { visible, typing, reset };
}

export function WhatsAppChat({
  messages,
  contactName = "Essence Lab",
  paused = false,
  className,
}: {
  messages: ChatMessage[];
  contactName?: string;
  paused?: boolean;
  className?: string;
}) {
  const { visible, typing } = useAnimatedChat(messages, { paused });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-3 bg-whatsapp-header px-4 py-3 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
          {contactName[0]}
        </div>
        <div>
          <p className="text-[13px] font-semibold">{contactName}</p>
          <p className="text-[10px] text-white/70">
            {typing ? "typing…" : "online"}
          </p>
        </div>
      </div>

      <div className="whatsapp-pattern flex min-h-[280px] flex-col gap-2 overflow-hidden p-3 md:min-h-[320px]">
        <AnimatePresence initial={false}>
          {visible.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex", msg.from === "customer" ? "justify-start" : "justify-end")}
            >
              <div className="max-w-[85%]">
                {msg.from === "ai" && (
                  <span className="mb-1 block text-right text-[9px] font-semibold text-primary">
                    ✦ AI suggested
                  </span>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 shadow-sm",
                    msg.from === "customer"
                      ? "rounded-bl-md bg-white"
                      : "rounded-br-md bg-whatsapp-green",
                  )}
                >
                  <p className="text-[13px] leading-relaxed text-[#111]">{msg.text}</p>
                  {msg.link && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white">
                      <div className="bg-muted px-3 py-2">
                        <p className="text-[11px] font-semibold text-primary">{msg.link.title}</p>
                        <p className="text-[10px] text-muted-foreground">{msg.link.subtitle}</p>
                      </div>
                    </div>
                  )}
                  <p className="mt-1 text-right text-[9px] text-muted-foreground">
                    {msg.time ??
                      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          {typing && <TypingIndicator align={typing === "customer" ? "left" : "right"} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CrmChat({
  messages,
  paused = false,
}: {
  messages: ChatMessage[];
  paused?: boolean;
}) {
  const { visible, typing } = useAnimatedChat(messages, { paused });

  return (
    <div className="flex min-h-[220px] flex-col gap-2 bg-[#fafafa] px-4 py-3">
      <AnimatePresence initial={false}>
        {visible.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn("flex", msg.from === "customer" ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-3.5 py-2",
                msg.from === "customer"
                  ? "rounded-bl-md bg-white shadow-sm ring-1 ring-border"
                  : "rounded-br-md bg-primary text-white",
              )}
            >
              <p className="text-[13px] leading-relaxed">{msg.text}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  msg.from === "customer" ? "text-muted-foreground" : "text-white/70",
                )}
              >
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}
        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-end"
          >
            <div className="rounded-2xl rounded-br-md bg-primary/20 px-4 py-3">
              <div className="flex gap-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const HERO_CHAT: ChatMessage[] = [
  { id: "1", from: "customer", text: "Hi! Can I get a quote for the premium plan?" },
  { id: "2", from: "business", text: "Absolutely! I'll send pricing details and delivery slots right away." },
  { id: "3", from: "customer", text: "Perfect. We need 50 units delivered by end of month." },
  { id: "4", from: "ai", text: "I've flagged this as a high-intent lead and moved them to Qualified." },
];

export const AI_PHONE_CHAT: ChatMessage[] = [
  { id: "1", from: "customer", text: "Hi, I need to change my order address", time: "10:14 AM" },
  {
    id: "2",
    from: "ai",
    text: "Of course! Here's a link to update your delivery details:",
    time: "10:15 AM",
    link: { title: "Update delivery address", subtitle: "yourstore.com/orders/update" },
  },
  { id: "3", from: "customer", text: "Done, thanks!", time: "10:16 AM" },
  {
    id: "4",
    from: "ai",
    text: "Perfect! Your order will arrive at the new address. Anything else I can help with?",
    time: "10:16 AM",
  },
];

export const BENTO_CHAT: ChatMessage[] = [
  { id: "1", from: "customer", text: "Do you ship to Delhi?" },
  { id: "2", from: "business", text: "Yes! 2–3 day delivery. Want me to send options?" },
  { id: "3", from: "customer", text: "Please, for a 3BHK setup" },
];
