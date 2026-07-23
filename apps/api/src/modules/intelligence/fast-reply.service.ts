import { Injectable } from "@nestjs/common";
import type { BusinessEmployeeProfile } from "@growvisi/shared";
import {
  defaultBusinessEmployeeProfile,
  formatWhatsAppReply,
  isCourtesyOnlyMessage,
  isSimpleAck,
  isSimpleGreeting,
  isSimpleThanks,
} from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";

/** Legacy fallbacks when profile pools are unexpectedly empty. */
const LEGACY_GREETING_TEMPLATES = [
  (biz: string) => `Hi! ${biz} here — what can I help you with?`,
  (biz: string) => `Hey! Welcome to ${biz} 👋 Bataiye, kya chahiye?`,
];

const LEGACY_RETURNING_GREETING_TEMPLATES = [
  () => `Hi! How can I help today?`,
  () => `Hey! What can I do for you?`,
];

const LEGACY_THANKS_TEMPLATES = [
  () => `You're welcome! Anything else, just message here.`,
  () => `Happy to help! Ping us anytime.`,
];

@Injectable()
export class FastReplyService {
  /** Thread already has a business/AI outbound message — avoid "welcome again". */
  threadAlreadyGreeted(ctx: ConversationContext): boolean {
    if (ctx.workingMemory) {
      return ctx.workingMemory.threadAlreadyEngaged;
    }
    return ctx.messages.some(
      (m) => m.direction === "OUTBOUND" && (m.content?.trim().length ?? 0) > 0,
    );
  }

  isFastPathMessage(text: string | null | undefined): boolean {
    return isCourtesyOnlyMessage(text);
  }

  compose(
    lastInbound: string | null | undefined,
    businessName: string,
    ctx: ConversationContext,
    businessProfile?: BusinessEmployeeProfile,
  ): string | null {
    if (!lastInbound?.trim()) return null;

    const biz = businessName.trim() || "us";
    const profile = businessProfile ?? defaultBusinessEmployeeProfile(biz);
    const returning = this.threadAlreadyGreeted(ctx);
    const hash = lastInbound.length + ctx.messages.length;

    if (isSimpleThanks(lastInbound) || isSimpleAck(lastInbound)) {
      const pool = profile.courtesyTemplates.thanks;
      const text =
        pool.length > 0
          ? pool[hash % pool.length]
          : LEGACY_THANKS_TEMPLATES[hash % LEGACY_THANKS_TEMPLATES.length]();
      return formatWhatsAppReply(text, { intentKind: "thanks", inboundText: lastInbound, autoSend: true });
    }

    if (isSimpleGreeting(lastInbound)) {
      if (returning) {
        const pool = profile.greetingVariants.returning;
        const text =
          pool.length > 0
            ? pool[hash % pool.length]
            : LEGACY_RETURNING_GREETING_TEMPLATES[
                hash % LEGACY_RETURNING_GREETING_TEMPLATES.length
              ]();
        return formatWhatsAppReply(text, {
          intentKind: "greeting",
          inboundText: lastInbound,
          autoSend: true,
        });
      }

      const pool = profile.greetingVariants.firstContact;
      const text =
        pool.length > 0
          ? pool[hash % pool.length]
          : LEGACY_GREETING_TEMPLATES[hash % LEGACY_GREETING_TEMPLATES.length](biz);
      return formatWhatsAppReply(text, {
        intentKind: "greeting",
        inboundText: lastInbound,
        autoSend: true,
      });
    }

    return null;
  }
}
