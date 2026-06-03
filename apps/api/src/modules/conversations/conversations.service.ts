import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@revenue-os/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappMessagingService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeGateway,
  ) {}

  getCapabilities() {
    return {
      aiSuggestReply: !!this.config.get<string>("OPENAI_API_KEY"),
    };
  }

  async getStats(user: JwtPayload) {
    const [totalConversations, unreadAgg, inboundMessages] = await Promise.all([
      this.prisma.conversation.count({
        where: { organizationId: user.organizationId },
      }),
      this.prisma.conversation.aggregate({
        where: { organizationId: user.organizationId },
        _sum: { unreadCount: true },
      }),
      this.prisma.message.count({
        where: {
          direction: "INBOUND",
          conversation: { organizationId: user.organizationId },
        },
      }),
    ]);

    return {
      totalConversations,
      unreadMessages: unreadAgg._sum.unreadCount ?? 0,
      inboundMessages,
    };
  }

  async list(user: JwtPayload, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: pageSize,
        include: {
          lead: { select: { id: true, stage: true, score: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.prisma.conversation.count({
        where: { organizationId: user.organizationId },
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      hasMore: skip + data.length < total,
    };
  }

  async getById(user: JwtPayload, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "asc" }, take: 200 },
        assignedTo: { select: { id: true, name: true, email: true } },
        whatsappAccount: {
          select: { displayPhoneNumber: true, isActive: true },
        },
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    if (conversation.unreadCount > 0) {
      await this.prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      });
      conversation.unreadCount = 0;
    }

    return conversation;
  }

  async sendMessage(user: JwtPayload, conversationId: string, content: string) {
    const text = content.trim();
    if (!text) {
      throw new BadRequestException("Message cannot be empty.");
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      include: { whatsappAccount: true },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    const waMessageId = await this.whatsapp.sendText(
      conversation.whatsappAccount,
      conversation.contactPhone,
      text,
    );

    const message = await this.prisma.message.create({
      data: {
        organizationId: user.organizationId,
        conversationId,
        waMessageId,
        direction: "OUTBOUND",
        type: "TEXT",
        status: "SENT",
        content: text,
        sentByUserId: user.sub,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.realtime.emitMessageNew(user.organizationId, { conversationId });
    this.realtime.emitInboxUpdated(user.organizationId);

    return message;
  }

  async suggestReply(user: JwtPayload, conversationId: string) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new BadRequestException("Smart replies are not available on this workspace.");
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    const ordered = [...conversation.messages].reverse();
    const transcript = ordered
      .map((m) => {
        const who = m.direction === "INBOUND" ? "Customer" : "Business";
        return `${who}: ${m.content ?? "(media)"}`;
      })
      .join("\n");

    const model = this.config.get<string>("AI_CHAT_MODEL") ?? "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "You draft WhatsApp replies for a sales team. Write one short, warm, professional message. Plain text only. No quotes or labels.",
          },
          {
            role: "user",
            content: `Draft the next reply.\n\n${transcript}`,
          },
        ],
      }),
    });

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new BadRequestException(body.error?.message ?? "Could not generate a suggestion.");
    }

    const suggestion = body.choices?.[0]?.message?.content?.trim();
    if (!suggestion) {
      throw new BadRequestException("No suggestion returned.");
    }

    return { suggestion };
  }

  async assign(user: JwtPayload, id: string, assignToUserId: string | null) {
    const conversation = await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: {
        assignedToId: assignToUserId,
        aiEnabled: assignToUserId ? false : undefined,
      },
    });
    if (conversation.count === 0) throw new NotFoundException();
    return this.getById(user, id);
  }

  async toggleAi(user: JwtPayload, id: string, aiEnabled: boolean) {
    await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { aiEnabled },
    });
    return this.getById(user, id);
  }
}
