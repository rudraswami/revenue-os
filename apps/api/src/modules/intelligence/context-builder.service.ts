import { Injectable, NotFoundException } from "@nestjs/common";
import type { LeadStage } from "@growvisi/shared";
import { buildWorkingMemory, resolveContextMessageLimit, type WorkingMemory } from "@growvisi/shared";
import type { Conversation, ConversationMemory, Lead, Message } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ConversationContextMessage {
  id: string;
  direction: string;
  content: string | null;
  sentByAi: boolean;
  createdAt: Date;
}

export interface ConversationContext {
  organizationId: string;
  conversationId: string;
  /** False when monthly lead cap blocked CRM lead creation — classify still runs. */
  hasLeadRecord: boolean;
  leadId: string;
  lead: {
    id: string;
    stage: LeadStage;
    score: number;
    displayName: string | null;
    phone: string;
    profile: Record<string, unknown>;
    aiEnabled: boolean;
  };
  conversation: {
    id: string;
    aiEnabled: boolean;
    metadata: Record<string, unknown>;
    contactName: string | null;
    lastInboundAt: Date | null;
  };
  messages: ConversationContextMessage[];
  transcript: string;
  lastInbound: string | null;
  ragQuery: string;
  observedMemory: Array<{
    id: string;
    type: string;
    content: string;
    source: string;
    createdAt: Date;
  }>;
  workingMemory: WorkingMemory;
}

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForConversation(
    organizationId: string,
    conversationId: string,
    messageLimit?: number,
  ): Promise<ConversationContext> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { lead: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const stage = (conversation.lead?.stage ?? "NEW") as LeadStage;
    const effectiveLimit =
      messageLimit ?? resolveContextMessageLimit(stage);

    const [messages, memories] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: effectiveLimit,
      }),
      this.prisma.conversationMemory.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    return this.assembleFromLoaded(organizationId, conversation, messages, memories);
  }

  /** TB-1: build inbox context without re-fetching conversation/messages. */
  assembleFromLoaded(
    organizationId: string,
    conversation: Conversation & { lead: Lead | null },
    messages: Message[],
    memories: ConversationMemory[],
  ): ConversationContext {
    const conversationId = conversation.id;
    const hasLeadRecord = Boolean(conversation.lead);
    const leadRow = conversation.lead ?? {
      id: `pending:${conversationId}`,
      stage: "NEW" as LeadStage,
      score: 10,
      displayName: conversation.contactName,
      phone: conversation.contactPhone,
      profile: {},
      aiEnabled: conversation.aiEnabled,
    };

    const ordered = [...messages].reverse();
    const messageRows = ordered.map((m) => ({
      id: m.id,
      direction: m.direction,
      content: m.content,
      sentByAi: m.sentByAi,
      createdAt: m.createdAt,
    }));

    const transcript = this.buildTranscript(messageRows);
    const lastInbound = [...ordered]
      .reverse()
      .find((m) => m.direction === "INBOUND")?.content ?? null;

    const profile =
      leadRow.profile && typeof leadRow.profile === "object"
        ? (leadRow.profile as Record<string, unknown>)
        : {};

    const metadata =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};

    const observedMemory = memories.map((m) => {
      const meta =
        m.metadata && typeof m.metadata === "object"
          ? (m.metadata as Record<string, unknown>)
          : {};
      return {
        id: m.id,
        type: m.type,
        content: m.content,
        source: typeof meta.source === "string" ? meta.source : "system",
        createdAt: m.createdAt,
      };
    });

    const summaryFromMemory =
      observedMemory.find((m) => m.type === "summary")?.content ?? null;
    const intentFromMemory = observedMemory.find((m) =>
      m.content.toLowerCase().startsWith("intent:"),
    )?.content;
    const ragQuery =
      [lastInbound, summaryFromMemory, intentFromMemory]
        .filter((p) => typeof p === "string" && p.trim().length > 0)
        .map((p) => String(p).trim())
        .join(" — ")
        .slice(0, 600) || (lastInbound ?? transcript).slice(0, 600);

    const workingMemory = buildWorkingMemory({
      lead: {
        stage: leadRow.stage as LeadStage,
        score: leadRow.score,
        displayName: leadRow.displayName,
        phone: leadRow.phone,
        profile,
      },
      conversation: { contactName: conversation.contactName },
      messages: messageRows,
      observedMemory,
    });

    return {
      organizationId,
      conversationId,
      hasLeadRecord,
      leadId: leadRow.id,
      lead: {
        id: leadRow.id,
        stage: leadRow.stage as LeadStage,
        score: leadRow.score,
        displayName: leadRow.displayName,
        phone: leadRow.phone,
        profile,
        aiEnabled: conversation.aiEnabled,
      },
      conversation: {
        id: conversation.id,
        aiEnabled: conversation.aiEnabled,
        metadata,
        contactName: conversation.contactName,
        lastInboundAt: conversation.lastInboundAt,
      },
      messages: messageRows,
      transcript,
      lastInbound,
      ragQuery,
      observedMemory,
      workingMemory,
    };
  }

  /**
   * Extract structured business profile fields from org settings JSON.
   * Returns fields like hours, address, payment methods for prompt injection.
   */
  static extractBusinessContext(settings: Record<string, unknown> | null | undefined): {
    hours: string | null;
    address: string | null;
    paymentMethods: string | null;
    socialLinks: string | null;
    phone: string | null;
  } {
    if (!settings || typeof settings !== "object") {
      return { hours: null, address: null, paymentMethods: null, socialLinks: null, phone: null };
    }

    // Fields live in intelligence.businessProfile after the settings merge
    const intelligence = settings.intelligence as Record<string, unknown> | undefined;
    const profile = intelligence?.businessProfile as Record<string, unknown> | undefined;
    const source = profile ?? settings;

    const str = (key: string): string | null => {
      const v = source[key];
      return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
    };
    return {
      hours: str("businessHours"),
      address: str("address"),
      paymentMethods: str("paymentMethods"),
      socialLinks: str("socialLinks"),
      phone: str("phone"),
    };
  }

  formatObservedMemoryBlock(memory: ConversationContext["observedMemory"]): string {
    if (memory.length === 0) return "";
    return memory
      .slice(0, 8)
      .map((m) => `- ${m.content}`)
      .join("\n");
  }

  private buildTranscript(messages: ConversationContextMessage[]): string {
    return messages
      .map((m) => {
        const who =
          m.direction === "INBOUND"
            ? "Customer"
            : m.sentByAi
              ? "AI"
              : "Business";
        return `${who}: ${m.content ?? "(media)"}`;
      })
      .join("\n");
  }
}
