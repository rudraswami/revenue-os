import { Injectable } from "@nestjs/common";
import type { BusinessEmployeeProfile } from "@growvisi/shared";
import { defaultBusinessEmployeeProfile, isCourtesyOnlyMessage, isSimpleAck, isSimpleGreeting, isSimpleThanks } from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";

/** Legacy fallbacks when profile pools are unexpectedly empty. */
const LEGACY_GREETING_TEMPLATES = [
  (biz: string) => `Hi! Thanks for messaging ${biz}. What can we help you with today?`,
  (biz: string) => `Hello! Welcome to ${biz} — how can we assist you?`,
];

const LEGACY_RETURNING_GREETING_TEMPLATES = [
  () => `Hi! How can we help you today?`,
  () => `Hello! What would you like to know?`,
];

const LEGACY_THANKS_TEMPLATES = [
  () => `You're welcome! Let us know if you need anything else.`,
  () => `Happy to help! Reach out anytime.`,
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
      if (pool.length > 0) {
        return pool[hash % pool.length];
      }
      return LEGACY_THANKS_TEMPLATES[hash % LEGACY_THANKS_TEMPLATES.length]();
    }

    if (isSimpleGreeting(lastInbound)) {
      if (returning) {
        const pool = profile.greetingVariants.returning;
        if (pool.length > 0) {
          return pool[hash % pool.length];
        }
        return LEGACY_RETURNING_GREETING_TEMPLATES[
          hash % LEGACY_RETURNING_GREETING_TEMPLATES.length
        ]();
      }

      const pool = profile.greetingVariants.firstContact;
      if (pool.length > 0) {
        return pool[hash % pool.length];
      }
      return LEGACY_GREETING_TEMPLATES[hash % LEGACY_GREETING_TEMPLATES.length](biz);
    }

    return null;
  }
}
