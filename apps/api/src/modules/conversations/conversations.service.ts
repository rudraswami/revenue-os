import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { createdAtFilter, parseMetricsPeriod, type MetricsPeriod } from "../../common/date-range";
import { EntitlementsService } from "../billing/entitlements.service";
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
    private readonly entitlements: EntitlementsService,
  ) {}

  getCapabilities() {
    const aiOn = !!this.config.get<string>("OPENAI_API_KEY");
    return {
      /** Primary: classify inbound threads for pipeline & insights */
      aiClassification: aiOn,
      /** Optional: human takeover reply draft in dashboard */
      aiSuggestReply: aiOn,
      /** We ingest via webhooks; outbound send is optional human takeover only */
      primaryUseCase: "conversation_intelligence" as const,
    };
  }

  async getStats(user: JwtPayload, period?: MetricsPeriod) {
    const orgId = user.organizationId;
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const messageDateFilter = range.gte ? { createdAt: range } : undefined;
    const leadDateFilter = range.gte ? { createdAt: range } : undefined;

    const [
      totalConversations,
      unreadAgg,
      inboundMessages,
      outboundMessages,
      classifiedLeads,
      aiClassifications,
      handoffConversations,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: {
          organizationId: orgId,
          ...(range.gte ? { createdAt: range } : {}),
        },
      }),
      this.prisma.conversation.aggregate({
        where: { organizationId: orgId },
        _sum: { unreadCount: true },
      }),
      this.prisma.message.count({
        where: {
          direction: "INBOUND",
          conversation: { organizationId: orgId },
          ...(messageDateFilter ?? {}),
        },
      }),
      this.prisma.message.count({
        where: {
          direction: "OUTBOUND",
          conversation: { organizationId: orgId },
          ...(messageDateFilter ?? {}),
        },
      }),
      this.prisma.lead.count({
        where: {
          organizationId: orgId,
          lastClassifiedAt: { not: null },
          ...(leadDateFilter ?? {}),
        },
      }),
      this.prisma.aiRun.count({
        where: {
          organizationId: orgId,
          type: "classify",
          status: "COMPLETED",
          ...(messageDateFilter ?? {}),
        },
      }),
      this.prisma.conversation.count({
        where: {
          organizationId: orgId,
          metadata: { path: ["requiresHuman"], equals: true },
        },
      }),
    ]);

    return {
      period: parsedPeriod,
      totalConversations,
      unreadMessages: unreadAgg._sum.unreadCount ?? 0,
      inboundMessages,
      outboundMessages,
      classifiedLeads,
      aiClassifications,
      humanHandoffRecommended: handoffConversations,
    };
  }

  async list(user: JwtPayload, page = 1, pageSize = 20, q?: string) {
    const skip = (page - 1) * pageSize;
    const query = q?.trim();
    const where = {
      organizationId: user.organizationId,
      ...(query
        ? {
            OR: [
              { contactName: { contains: query, mode: "insensitive" as const } },
              { contactPhone: { contains: query } },
              {
                messages: {
                  some: { content: { contains: query, mode: "insensitive" as const } },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
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
        where,
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

    return conversation;
  }

  async markRead(user: JwtPayload, id: string) {
    const result = await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { unreadCount: 0 },
    });
    if (result.count === 0) throw new NotFoundException("Conversation not found");
    return { ok: true };
  }

  async sendMessage(user: JwtPayload, conversationId: string, content: string) {
    await this.entitlements.assertHasAccess(user.organizationId);

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
    await this.entitlements.assertHasAccess(user.organizationId);

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

    const knowledgeDocs = await this.prisma.knowledgeDocument.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { title: true, rawContent: true },
    });

    const knowledgeBlock =
      knowledgeDocs.length > 0
        ? knowledgeDocs
            .map((d) => `### ${d.title}\n${(d.rawContent ?? "").slice(0, 1200)}`)
            .join("\n\n")
        : "";

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
            content: [
              "You draft WhatsApp replies for a sales team. Write one short, warm, professional message. Plain text only. No quotes or labels.",
              knowledgeBlock
                ? `Use this business context when relevant:\n\n${knowledgeBlock}`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
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
    if (assignToUserId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: user.organizationId, userId: assignToUserId },
        select: { id: true },
      });
      if (!member) {
        throw new BadRequestException("You can only assign conversations to members of your workspace.");
      }
    }

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

  async streamMessageMedia(user: JwtPayload, conversationId: string, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        organizationId: user.organizationId,
      },
      include: {
        conversation: {
          include: { whatsappAccount: true },
        },
      },
    });
    if (!message) throw new NotFoundException("Message not found");

    const payload = message.payload as Record<string, unknown>;
    const typeKey = String(message.type).toLowerCase();
    const block = payload[typeKey] as { id?: string } | undefined;
    const mediaId = block?.id;
    if (!mediaId) {
      throw new BadRequestException("This message has no downloadable media.");
    }

    return this.whatsapp.fetchMedia(
      message.conversation.whatsappAccount,
      mediaId,
    );
  }

  async toggleAi(user: JwtPayload, id: string, aiEnabled: boolean) {
    await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { aiEnabled },
    });
    return this.getById(user, id);
  }
}
