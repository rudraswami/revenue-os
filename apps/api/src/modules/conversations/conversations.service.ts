import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeadStage, type Prisma } from "@prisma/client";
import type { JwtPayload } from "@growvisi/shared";
import { requireConversationAssignment } from "../../common/auth/authorization";
import { createdAtFilter, parseMetricsPeriod, type MetricsPeriod } from "../../common/date-range";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import {
  formatDurationMs,
  mergeCoachingSettings,
  normalizeWorkspaceOpsSettings,
} from "../organizations/workspace-settings";
import { EntitlementsService } from "../billing/entitlements.service";
import { KnowledgeEmbedService } from "../knowledge/knowledge-embed.service";
import { AiClassifyService, type HumanAiCorrectionInput } from "../ai/ai-classify.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import {
  clearAssignmentMeta,
  parseAssignmentMeta,
  withAssignmentMeta,
} from "./assignment-metadata";

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappMessagingService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeGateway,
    private readonly entitlements: EntitlementsService,
    private readonly knowledgeEmbed: KnowledgeEmbedService,
    private readonly aiClassify: AiClassifyService,
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

    const closedStages: LeadStage[] = [LeadStage.WON, LeadStage.LOST];
    const activeQueueWhere: Prisma.ConversationWhereInput = {
      organizationId: orgId,
      OR: [
        { leadId: null },
        { lead: { is: { stage: { notIn: closedStages } } } },
      ],
    };

    const [
      totalConversations,
      unreadAgg,
      inboundMessages,
      outboundMessages,
      classifiedLeads,
      aiClassifications,
      handoffConversations,
      mineOpen,
      unassignedOpen,
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
          ...activeQueueWhere,
          metadata: { path: ["requiresHuman"], equals: true },
        },
      }),
      this.prisma.conversation.count({
        where: {
          ...activeQueueWhere,
          assignedToId: user.sub,
        },
      }),
      this.prisma.conversation.count({
        where: {
          ...activeQueueWhere,
          assignedToId: null,
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
      /** Active open queue (not Won/Lost) — agent daily habit */
      queue: {
        yourTurn: handoffConversations,
        mine: mineOpen,
        unassigned: unassignedOpen,
      },
    };
  }

  async list(user: JwtPayload, page = 1, pageSize = 20, q?: string, filter?: string, scope?: string) {
    const skip = (page - 1) * pageSize;
    const query = q?.trim();
    const closedStages: LeadStage[] = [LeadStage.WON, LeadStage.LOST];
    const listScope = scope === "closed" ? "closed" : "active";

    const and: Prisma.ConversationWhereInput[] = [{ organizationId: user.organizationId }];

    if (filter === "handoff") {
      and.push({ metadata: { path: ["requiresHuman"], equals: true } });
    }
    if (filter === "unread") {
      and.push({ unreadCount: { gt: 0 } });
    }
    if (filter === "unassigned") {
      and.push({ assignedToId: null });
    }
    if (filter === "mine") {
      and.push({ assignedToId: user.sub });
    }

    if (listScope === "closed") {
      and.push({
        lead: { is: { stage: { in: closedStages } } },
      });
    } else {
      and.push({
        OR: [
          { leadId: null },
          { lead: { is: { stage: { notIn: closedStages } } } },
        ],
      });
    }

    if (query) {
      and.push({
        OR: [
          { contactName: { contains: query, mode: "insensitive" } },
          { contactPhone: { contains: query } },
          {
            messages: {
              some: { content: { contains: query, mode: "insensitive" } },
            },
          },
        ],
      });
    }

    const where: Prisma.ConversationWhereInput = { AND: and };

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
      data: data.map((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        return {
          ...row,
          requiresHuman: meta.requiresHuman === true,
        };
      }),
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

    const meta = (conversation.metadata ?? {}) as Record<string, unknown>;
    const profile = (conversation.lead?.profile ?? {}) as Record<string, unknown>;

    const lastAiRun = await this.prisma.aiRun.findFirst({
      where: {
        organizationId: user.organizationId,
        conversationId: id,
        type: "classify",
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        output: true,
        createdAt: true,
        latencyMs: true,
      },
    });

    const runOutput = (lastAiRun?.output ?? {}) as Record<string, unknown>;

    const aiContext = conversation.lead?.lastClassifiedAt
      ? {
          intent: String(profile.lastIntent ?? runOutput.intent ?? ""),
          sentiment: String(profile.lastSentiment ?? runOutput.sentiment ?? ""),
          confidence:
            conversation.lead.aiConfidence ??
            (typeof runOutput.confidence === "number" ? runOutput.confidence : null),
          summary: String(profile.summary ?? runOutput.summary ?? ""),
          nextAction: String(profile.nextAction ?? ""),
          suggestedActions: Array.isArray(profile.suggestedActions)
            ? profile.suggestedActions.map(String)
            : Array.isArray(runOutput.suggestedActions)
              ? runOutput.suggestedActions.map(String)
              : [],
          tags: Array.isArray(profile.aiTags) ? profile.aiTags.map(String) : [],
          classifiedAt: conversation.lead.lastClassifiedAt.toISOString(),
          runId: lastAiRun?.id ?? null,
          humanCorrected: !!profile.humanCorrectedAt,
          humanCorrectedAt:
            typeof profile.humanCorrectedAt === "string" ? profile.humanCorrectedAt : null,
        }
      : null;

    return {
      ...conversation,
      requiresHuman: meta.requiresHuman === true,
      handoffReason: typeof meta.handoffReason === "string" ? meta.handoffReason : null,
      handoffAt: typeof meta.handoffAt === "string" ? meta.handoffAt : null,
      assignment: await this.resolveAssignmentExplain(meta, user.organizationId),
      aiContext,
    };
  }

  private async resolveAssignmentExplain(
    meta: Record<string, unknown>,
    organizationId: string,
  ) {
    const parsed = parseAssignmentMeta(meta);
    if (!parsed) return null;
    if (!parsed.byUserId) {
      return {
        source: parsed.source,
        reason: parsed.reason,
        at: parsed.at,
        byUser: null,
      };
    }
    const byUser = await this.prisma.user.findFirst({
      where: {
        id: parsed.byUserId,
        memberships: { some: { organizationId } },
      },
      select: { id: true, name: true, email: true },
    });
    return {
      source: parsed.source,
      reason: parsed.reason,
      at: parsed.at,
      byUser: byUser
        ? { id: byUser.id, name: byUser.name, email: byUser.email }
        : { id: parsed.byUserId, name: null, email: "Teammate" },
    };
  }

  async resolveHandoff(user: JwtPayload, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { metadata: true },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    const meta = (conversation.metadata ?? {}) as Record<string, unknown>;
    await this.prisma.conversation.update({
      where: { id },
      data: {
        metadata: {
          ...meta,
          requiresHuman: false,
          handoffResolvedAt: new Date().toISOString(),
          handoffResolvedBy: user.sub,
        },
      },
    });

    this.realtime.emitInboxUpdated(user.organizationId);
    return { ok: true };
  }

  /** AI Trust Loop — correct classification; soft-reclassify refreshes narrative. */
  async correctAiClassification(
    user: JwtPayload,
    id: string,
    input: HumanAiCorrectionInput,
  ) {
    const result = await this.aiClassify.applyHumanCorrection(user, id, input);
    const detail = await this.getById(user, id);
    return { ...result, conversation: detail };
  }

  /**
   * One-click handoff: assign to caller, disable AI, resolve handoff, create follow-up task.
   */
  async takeover(user: JwtPayload, id: string, taskTitle?: string) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        lead: { select: { id: true, displayName: true, phone: true } },
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    const meta = (conversation.metadata ?? {}) as Record<string, unknown>;
    const title =
      taskTitle?.trim().slice(0, 120) ||
      `Follow up: ${conversation.lead?.displayName ?? conversation.contactName ?? conversation.contactPhone}`;

    await this.prisma.$transaction(async (tx) => {
      const assignmentMeta = withAssignmentMeta(meta, {
        source: "takeover",
        reason: null,
        at: new Date().toISOString(),
        byUserId: user.sub,
      });
      await tx.conversation.update({
        where: { id },
        data: {
          assignedToId: user.sub,
          aiEnabled: false,
          metadata: {
            ...assignmentMeta,
            requiresHuman: false,
            handoffResolvedAt: new Date().toISOString(),
            handoffResolvedBy: user.sub,
            takenOverAt: new Date().toISOString(),
            takenOverBy: user.sub,
          },
        },
      });

      if (conversation.leadId) {
        await tx.task.create({
          data: {
            organizationId: user.organizationId,
            title,
            priority: "HIGH",
            leadId: conversation.leadId,
            assignedToId: user.sub,
            createdById: user.sub,
          },
        });
      }
    });

    const orgRow = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    const orgSettings =
      orgRow?.settings && typeof orgRow.settings === "object"
        ? (orgRow.settings as Record<string, unknown>)
        : {};
    if (!(orgSettings.coaching as { firstTakeoverAt?: string } | undefined)?.firstTakeoverAt) {
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          settings: mergeCoachingSettings(orgSettings, {
            firstTakeoverAt: new Date().toISOString(),
          }) as object,
        },
      });
    }

    this.realtime.emitInboxUpdated(user.organizationId);
    return this.getById(user, id);
  }

  private async clearHandoffIfNeeded(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true, organizationId: true },
    });
    if (!conversation) return;
    const meta = (conversation.metadata ?? {}) as Record<string, unknown>;
    if (meta.requiresHuman !== true) return;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: {
          ...meta,
          requiresHuman: false,
          handoffResolvedAt: new Date().toISOString(),
          handoffResolvedBy: userId,
        },
      },
    });
    this.realtime.emitInboxUpdated(conversation.organizationId);
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

    if (!conversation.whatsappAccount.isActive) {
      throw new BadRequestException("This WhatsApp number is disconnected. Reconnect it in Settings.");
    }

    const withinWindow =
      !!conversation.lastInboundAt &&
      Date.now() - conversation.lastInboundAt.getTime() < 24 * 60 * 60 * 1000;

    if (!withinWindow) {
      throw new BadRequestException(
        conversation.lastInboundAt
          ? "The 24-hour WhatsApp reply window has expired. Start a new outbound message with an approved template."
          : "Customers must message you first before free-text replies. Use New message with an approved template to reach them.",
      );
    }

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

    await this.clearHandoffIfNeeded(conversationId, user.sub);
    await this.recordFirstResponse(conversationId, user.organizationId);

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

    const ordered = [...conversation.messages].reverse();
    const transcriptSnippet = ordered
      .slice(-4)
      .map((m) => m.content)
      .filter(Boolean)
      .join(" ");

    const ragChunks = await this.knowledgeEmbed.search(
      user.organizationId,
      transcriptSnippet || ordered.at(-1)?.content || "customer inquiry",
      5,
    );

    const knowledgeBlock =
      ragChunks.length > 0
        ? ragChunks.map((c) => `### ${c.title}\n${c.content}`).join("\n\n")
        : (
            await this.prisma.knowledgeDocument.findMany({
              where: { organizationId: user.organizationId },
              orderBy: { updatedAt: "desc" },
              take: 3,
              select: { title: true, rawContent: true },
            })
          )
            .map((d) => `### ${d.title}\n${(d.rawContent ?? "").slice(0, 800)}`)
            .join("\n\n");

    const transcript = ordered
      .map((m) => {
        const who = m.direction === "INBOUND" ? "Customer" : "Business";
        return `${who}: ${m.content ?? "(media)"}`;
      })
      .join("\n");

    const model = this.config.get<string>("AI_CHAT_MODEL") ?? "gpt-4o-mini";
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
      25_000,
    );

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

    return {
      suggestion,
      sources: ragChunks.map((c) => ({ title: c.title, similarity: c.similarity })),
      usedRag: ragChunks.length > 0,
    };
  }

  async assign(user: JwtPayload, id: string, assignToUserId: string | null) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { assignedToId: true, leadId: true, metadata: true },
    });
    if (!existing) throw new NotFoundException();

    requireConversationAssignment(user, existing.assignedToId, assignToUserId);

    if (assignToUserId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: user.organizationId, userId: assignToUserId },
        select: { id: true },
      });
      if (!member) {
        throw new BadRequestException("You can only assign conversations to members of your workspace.");
      }
    }

    const prevMeta =
      existing.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};

    const nextMeta = assignToUserId
      ? withAssignmentMeta(prevMeta, {
          source: assignToUserId === user.sub && !existing.assignedToId ? "takeover" : "manual",
          reason: null,
          at: new Date().toISOString(),
          byUserId: user.sub,
        })
      : clearAssignmentMeta(prevMeta);

    const conversation = await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: {
        assignedToId: assignToUserId,
        aiEnabled: assignToUserId ? false : undefined,
        metadata: nextMeta as object,
      },
    });
    if (conversation.count === 0) throw new NotFoundException();

    if (assignToUserId && existing.leadId) {
      await this.prisma.lead.updateMany({
        where: {
          id: existing.leadId,
          organizationId: user.organizationId,
        },
        data: { ownerId: assignToUserId },
      });
    }

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

  /**
   * Start or continue an outbound conversation. New numbers require an approved
   * WhatsApp template (Meta policy). Existing threads within 24h can use text.
   */
  async startOutbound(
    user: JwtPayload,
    input: {
      phone: string;
      displayName?: string | null;
      content?: string;
      templateName?: string;
      languageCode?: string;
      templateParams?: string[];
    },
  ) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const phone = input.phone.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) {
      throw new BadRequestException("Enter a valid phone number with country code (e.g. 919876543210).");
    }

    const account = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!account) {
      throw new BadRequestException("Connect an active WhatsApp number before sending messages.");
    }

    const waConversationKey = `${account.id}:${phone}`;
    let conversation = await this.prisma.conversation.findUnique({
      where: { organizationId_waConversationKey: { organizationId: user.organizationId, waConversationKey } },
    });

    const withinWindow =
      conversation?.lastInboundAt &&
      Date.now() - conversation.lastInboundAt.getTime() < 24 * 60 * 60 * 1000;

    let lead = await this.prisma.lead.findUnique({
      where: { organizationId_phone: { organizationId: user.organizationId, phone } },
    });

    if (!lead) {
      await this.entitlements.assertCanCreateLead(user.organizationId);
      lead = await this.prisma.lead.create({
        data: {
          organizationId: user.organizationId,
          phone,
          displayName: input.displayName?.trim() || null,
          source: "outbound",
        },
      });
    } else if (input.displayName?.trim() && !lead.displayName) {
      lead = await this.prisma.lead.update({
        where: { id: lead.id },
        data: { displayName: input.displayName.trim() },
      });
    }

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: user.organizationId,
          whatsappAccountId: account.id,
          waConversationKey,
          contactPhone: phone,
          contactName: input.displayName?.trim() || lead.displayName,
          leadId: lead.id,
          lastMessageAt: new Date(),
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { leadId: lead.id },
      });
    }

    let waMessageId: string;
    let messageType: "TEXT" | "TEMPLATE" = "TEXT";
    let content = input.content?.trim() ?? "";

    if (input.templateName?.trim()) {
      waMessageId = await this.whatsapp.sendTemplate(
        account,
        phone,
        input.templateName.trim(),
        input.languageCode ?? "en",
        input.templateParams ?? [],
      );
      messageType = "TEMPLATE";
      content = input.templateName.trim();
    } else if (content) {
      if (!withinWindow && !conversation.lastInboundAt) {
        throw new BadRequestException(
          "First message to a new number must use an approved WhatsApp template. Select a template name.",
        );
      }
      if (!withinWindow) {
        throw new BadRequestException(
          "The 24-hour reply window has expired. Use an approved WhatsApp template to re-engage.",
        );
      }
      waMessageId = await this.whatsapp.sendText(account, phone, content);
    } else {
      throw new BadRequestException("Provide a message or an approved template name.");
    }

    const message = await this.prisma.message.create({
      data: {
        organizationId: user.organizationId,
        conversationId: conversation.id,
        waMessageId,
        direction: "OUTBOUND",
        type: messageType,
        status: "SENT",
        content: messageType === "TEXT" ? content : `Template: ${content}`,
        sentByUserId: user.sub,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), contactName: conversation.contactName ?? input.displayName ?? undefined },
    });

    await this.recordFirstResponse(conversation.id, user.organizationId);

    this.realtime.emitMessageNew(user.organizationId, { conversationId: conversation.id });
    this.realtime.emitInboxUpdated(user.organizationId);

    return { conversation: await this.getById(user, conversation.id), message };
  }

  private async getSlaTargetHours(organizationId: string): Promise<number> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    return normalizeWorkspaceOpsSettings(settings.ops).sla.targetHours;
  }

  async recordFirstResponse(conversationId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { id: true, firstResponseAt: true },
    });
    if (!conversation || conversation.firstResponseAt) return;

    const firstInbound = await this.prisma.message.findFirst({
      where: { conversationId, direction: "INBOUND" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!firstInbound) return;

    const now = new Date();
    const responseMs = now.getTime() - firstInbound.createdAt.getTime();
    const targetHours = await this.getSlaTargetHours(organizationId);
    const slaBreached = responseMs > targetHours * 3_600_000;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { firstResponseAt: now, slaBreached },
    });
  }

  async getSlaMetrics(user: JwtPayload, period?: MetricsPeriod) {
    const parsedPeriod = parseMetricsPeriod(period);
    const range = createdAtFilter(parsedPeriod);
    const orgId = user.organizationId;
    const targetHours = await this.getSlaTargetHours(orgId);

    const responded = await this.prisma.conversation.findMany({
      where: {
        organizationId: orgId,
        firstResponseAt: {
          not: null,
          ...(range.gte ? { gte: range.gte } : {}),
        },
      },
      select: {
        id: true,
        contactName: true,
        contactPhone: true,
        firstResponseAt: true,
        slaBreached: true,
      },
      orderBy: { firstResponseAt: "desc" },
      take: 500,
    });

    const responseTimesMs: number[] = [];
    const slowest: Array<{
      id: string;
      label: string;
      responseMs: number;
      responseLabel: string;
      breached: boolean;
    }> = [];

    for (const conv of responded) {
      const firstInbound = await this.prisma.message.findFirst({
        where: { conversationId: conv.id, direction: "INBOUND" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (!firstInbound || !conv.firstResponseAt) continue;
      const ms = conv.firstResponseAt.getTime() - firstInbound.createdAt.getTime();
      responseTimesMs.push(ms);
      slowest.push({
        id: conv.id,
        label: conv.contactName ?? conv.contactPhone,
        responseMs: ms,
        responseLabel: formatDurationMs(ms),
        breached: conv.slaBreached,
      });
    }

    slowest.sort((a, b) => b.responseMs - a.responseMs);

    const medianMs =
      responseTimesMs.length > 0
        ? [...responseTimesMs].sort((a, b) => a - b)[Math.floor(responseTimesMs.length / 2)]
        : null;

    const withinSla = responseTimesMs.filter(
      (ms) => ms <= targetHours * 3_600_000,
    ).length;
    const breachCount = responded.filter((c) => c.slaBreached).length;

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unanswered = await this.prisma.conversation.count({
      where: {
        organizationId: orgId,
        status: "OPEN",
        lastInboundAt: { lt: cutoff24h },
        OR: [{ firstResponseAt: null }, { unreadCount: { gt: 0 } }],
      },
    });

    return {
      period: parsedPeriod,
      targetHours,
      sampleSize: responseTimesMs.length,
      medianMs,
      medianLabel: medianMs != null ? formatDurationMs(medianMs) : null,
      withinSlaPercent:
        responseTimesMs.length > 0
          ? Math.round((withinSla / responseTimesMs.length) * 100)
          : null,
      breachCount,
      unansweredOver24h: unanswered,
      slowest: slowest.slice(0, 8),
      note: "Measures first human reply sent from Growvisi Inbox. Replies sent only in WhatsApp (outside Growvisi) are not included.",
    };
  }
}
