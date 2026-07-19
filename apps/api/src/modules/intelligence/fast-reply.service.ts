import { Injectable } from "@nestjs/common";
import { isSimpleAck, isSimpleGreeting, isSimpleThanks } from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";

const GREETING_TEMPLATES = [
  (biz: string) => `Hi! Thanks for messaging ${biz}. What can we help you with today?`,
  (biz: string) => `Hello! Welcome to ${biz} — how can we assist you?`,
  (biz: string) => `Hi there! You're speaking with ${biz}. What are you looking for?`,
];

const RETURNING_GREETING_TEMPLATES = [
  () => `Hi! How can we help you today?`,
  () => `Hello! What would you like to know?`,
  () => `Hi — happy to help. What do you need?`,
];

const THANKS_TEMPLATES = [
  () => `You're welcome! Let us know if you need anything else.`,
  () => `Happy to help! Reach out anytime.`,
  () => `Anytime! We're here if you have more questions.`,
];

@Injectable()
export class FastReplyService {
  /** Thread already has a business/AI outbound message — avoid "welcome again". */
  threadAlreadyGreeted(ctx: ConversationContext): boolean {
    return ctx.messages.some(
      (m) => m.direction === "OUTBOUND" && (m.content?.trim().length ?? 0) > 0,
    );
  }

  isFastPathMessage(text: string | null | undefined): boolean {
    return isSimpleGreeting(text) || isSimpleThanks(text) || isSimpleAck(text);
  }

  compose(
    lastInbound: string | null | undefined,
    businessName: string,
    ctx: ConversationContext,
  ): string | null {
    if (!lastInbound?.trim()) return null;

    const biz = businessName.trim() || "us";
    const returning = this.threadAlreadyGreeted(ctx);
    const hash = lastInbound.length + ctx.messages.length;

    if (isSimpleThanks(lastInbound) || isSimpleAck(lastInbound)) {
      return THANKS_TEMPLATES[hash % THANKS_TEMPLATES.length]();
    }

    if (isSimpleGreeting(lastInbound)) {
      const pool = returning ? RETURNING_GREETING_TEMPLATES : GREETING_TEMPLATES;
      return pool[hash % pool.length](biz);
    }

    return null;
  }
}
