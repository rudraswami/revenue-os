import { Injectable, NotFoundException } from "@nestjs/common";
import type { LeadStage } from "@growvisi/shared";
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
}

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForConversation(
    organizationId: string,
    conversationId: string,
    messageLimit = 16,
  ): Promise<ConversationContext> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "desc" }, take: messageLimit },
      },
    });

    if (!conversation?.lead) {
      throw new NotFoundException("Conversation or lead not found");
    }

    const ordered = [...conversation.messages].reverse();
    const transcript = this.buildTranscript(ordered);
    const lastInbound = [...ordered]
      .reverse()
      .find((m) => m.direction === "INBOUND")?.content ?? null;
    const ragQuery = (lastInbound ?? transcript).slice(0, 600);

    const profile =
      conversation.lead.profile && typeof conversation.lead.profile === "object"
        ? (conversation.lead.profile as Record<string, unknown>)
        : {};

    const metadata =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};

    const memories = await this.prisma.conversationMemory.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return {
      organizationId,
      conversationId,
      leadId: conversation.lead.id,
      lead: {
        id: conversation.lead.id,
        stage: conversation.lead.stage as LeadStage,
        score: conversation.lead.score,
        displayName: conversation.lead.displayName,
        phone: conversation.lead.phone,
        profile,
        aiEnabled: conversation.aiEnabled,
      },
      conversation: {
        id: conversation.id,
        aiEnabled: conversation.aiEnabled,
        metadata,
        contactName: conversation.contactName,
      },
      messages: ordered.map((m) => ({
        id: m.id,
        direction: m.direction,
        content: m.content,
        sentByAi: m.sentByAi,
        createdAt: m.createdAt,
      })),
      transcript,
      lastInbound,
      ragQuery,
      observedMemory: memories.map((m) => {
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
      }),
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
