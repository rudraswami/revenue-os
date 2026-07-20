import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeadStage, type Prisma } from "@prisma/client";
import type { JwtPayload } from "@growvisi/shared";
import { DOMAIN_EVENTS, hasCapability, resolveContextMessageLimit } from "@growvisi/shared";
import { requireConversationAssignment } from "../../common/auth/authorization";
import { createdAtFilter, parseMetricsPeriod, type MetricsPeriod } from "../../common/date-range";
import {
  formatDurationMs,
  mergeCoachingSettings,
  normalizeWorkspaceOpsSettings,
} from "../organizations/workspace-settings";
import { EntitlementsService } from "../billing/entitlements.service";
import { IntelligenceQueryService } from "../intelligence/intelligence-query.service";
import { LearningSignalService } from "../intelligence/learning-signal.service";
import { SuggestReplyService } from "../intelligence/suggest-reply.service";
import { ReplyComposerService } from "../intelligence/reply-composer.service";
import { BusinessEventService } from "../events/business-event.service";
import { AiClassifyService, type HumanAiCorrectionInput } from "../ai/ai-classify.service";
import { PrismaService } from "../prisma/prisma.service";
import { ServerCacheService } from "../server-cache/server-cache.service";
import {
  SERVER_CACHE_TTL,
  queueStatsCacheKey,
} from "../server-cache/server-cache.keys";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import {
  clearAssignmentMeta,
  parseAssignmentMeta,
  withAssignmentMeta,
} from "./assignment-metadata";
import { parseCampaignAttributionMeta } from "../campaigns/campaign-reply-attribution";

const INBOX_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INBOX_DOCUMENT_MIMES = new Set(["application/pdf"]);
const INBOX_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const INBOX_DOCUMENT_MAX_BYTES = 16 * 1024 * 1024;

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappMessagingService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeGateway,
    private readonly entitlements: EntitlementsService,
    private readonly suggestReplyService: SuggestReplyService,
    private readonly replyComposer: ReplyComposerService,
    private readonly intelligenceQuery: IntelligenceQueryService,
    private readonly learningSignals: LearningSignalService,
    private readonly businessEvents: BusinessEventService,
    private readonly aiClassify: AiClassifyService,
    private readonly serverCache: ServerCacheService,
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

  /** Team members without inbox.view.team may only see unassigned + own threads. */
  private inboxListScope(user: JwtPayload): Prisma.ConversationWhereInput | null {
    if (hasCapability(user.role, "inbox.view.team")) return null;
    if (!hasCapability(user.role, "inbox.reply")) {
      throw new ForbiddenException("You do not have permission to view conversations.");
    }
    return {
      OR: [{ assignedToId: user.sub }, { assignedToId: null }],
    };
  }

  private assertInboxThreadAccess(
    user: JwtPayload,
    conversation: { assignedToId: string | null },
  ): void {
    if (hasCapability(user.role, "inbox.view.team")) return;
    if (!hasCapability(user.role, "inbox.reply")) {
      throw new ForbiddenException("You do not have permission to view this conversation.");
    }
    if (conversation.assignedToId && conversation.assignedToId !== user.sub) {
      throw new ForbiddenException("This conversation is assigned to someone else.");
    }
  }

  async getStats(user: JwtPayload, period?: MetricsPeriod, scope?: string) {
    return (await this.getStatsCached(user, period, scope)).value;
  }

  async getStatsCached(user: JwtPayload, period?: MetricsPeriod, scope?: string) {
    if (scope === "queue") {
      return this.getQueueStatsCached(user);
    }
    const value = await this.loadPeriodStats(user, period);
    return { value, redisHit: false };
  }

  private async loadPeriodStats(user: JwtPayload, period?: MetricsPeriod) {
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
      postCloseUnread,
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
      this.prisma.conversation.count({
        where: {
          organizationId: orgId,
          unreadCount: { gt: 0 },
          lead: { is: { stage: { in: closedStages } } },
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
        postCloseUnread,
      },
    };
  }

  /** Lightweight counters for sidebar badge + inbox queue tabs (no period aggregates). */
  async getQueueStats(user: JwtPayload) {
    return (await this.getQueueStatsCached(user)).value;
  }

  async getQueueStatsCached(user: JwtPayload) {
    const cacheKey = queueStatsCacheKey(user.organizationId, user.sub);
    const { value: cached, hit } = await this.serverCache.getWithMeta<
      Awaited<ReturnType<ConversationsService["loadQueueStats"]>>
    >(cacheKey);
    if (cached) {
      return { value: cached, redisHit: hit };
    }

    const stats = await this.loadQueueStats(user);
    await this.serverCache.set(cacheKey, stats, SERVER_CACHE_TTL.queueStatsSec);
    return { value: stats, redisHit: false };
  }

  private async loadQueueStats(user: JwtPayload) {
    const orgId = user.organizationId;
    const closedStages: LeadStage[] = [LeadStage.WON, LeadStage.LOST];
    const activeQueueWhere: Prisma.ConversationWhereInput = {
      organizationId: orgId,
      OR: [
        { leadId: null },
        { lead: { is: { stage: { notIn: closedStages } } } },
      ],
    };

    const [unreadAgg, handoffConversations, mineOpen, unassignedOpen, postCloseUnread] =
      await Promise.all([
        this.prisma.conversation.aggregate({
          where: { organizationId: orgId },
          _sum: { unreadCount: true },
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
        this.prisma.conversation.count({
          where: {
            organizationId: orgId,
            unreadCount: { gt: 0 },
            lead: { is: { stage: { in: closedStages } } },
          },
        }),
      ]);

    return {
      unreadMessages: unreadAgg._sum.unreadCount ?? 0,
      humanHandoffRecommended: handoffConversations,
      queue: {
        yourTurn: handoffConversations,
        mine: mineOpen,
        unassigned: unassignedOpen,
        postCloseUnread,
      },
    };
  }

  async listMessages(
    user: JwtPayload,
    conversationId: string,
    before?: string,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      select: { id: true, assignedToId: true },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    this.assertInboxThreadAccess(user, conversation);

    const take = Math.min(Math.max(limit, 1), 100);
    const beforeDate = before ? new Date(before) : undefined;
    if (before && Number.isNaN(beforeDate!.getTime())) {
      throw new BadRequestException("Invalid before cursor");
    }

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
    });

    const hasMore = rows.length > take;
    return {
      messages: rows.slice(0, take).reverse(),
      hasMore,
    };
  }

  async exportTranscript(user: JwtPayload, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      select: {
        id: true,
        assignedToId: true,
        contactName: true,
        contactPhone: true,
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    this.assertInboxThreadAccess(user, conversation);

    const lines: string[] = [];
    const headerName = conversation.contactName ?? conversation.contactPhone;
    lines.push(`Growvisi conversation — ${headerName}`);
    lines.push(`Phone: ${conversation.contactPhone}`);
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push("");

    let before: Date | undefined;
    let total = 0;
    const maxMessages = 2_000;

    while (total < maxMessages) {
      const batch = await this.prisma.message.findMany({
        where: {
          conversationId,
          ...(before ? { createdAt: { lt: before } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      if (batch.length === 0) break;

      const ordered = [...batch].reverse();
      for (const msg of ordered) {
        const who = msg.direction === "INBOUND" ? "Customer" : "Team";
        const at = msg.createdAt.toISOString();
        const type = String(msg.type);
        const body =
          msg.content?.trim() ||
          (type !== "TEXT" ? `[${type}]` : "—");
        lines.push(`[${at}] ${who}: ${body}`);
        total += 1;
        if (total >= maxMessages) break;
      }

      before = batch[batch.length - 1]?.createdAt;
      if (batch.length < 100) break;
    }

    if (total >= maxMessages) {
      lines.push("");
      lines.push(`(Truncated at ${maxMessages} messages)`);
    }

    const safeName = headerName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "chat";
    return {
      filename: `growvisi-${safeName.slice(0, 40)}.txt`,
      contentType: "text/plain; charset=utf-8",
      body: lines.join("\n"),
    };
  }

  async list(user: JwtPayload, page = 1, pageSize = 20, q?: string, filter?: string, scope?: string) {
    const skip = (page - 1) * pageSize;
    const query = q?.trim();
    const closedStages: LeadStage[] = [LeadStage.WON, LeadStage.LOST];
    const listScope = scope === "closed" ? "closed" : "active";

    const and: Prisma.ConversationWhereInput[] = [{ organizationId: user.organizationId }];

    const inboxScope = this.inboxListScope(user);
    if (inboxScope) and.push(inboxScope);

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
          {
            unreadCount: { gt: 0 },
            lead: { is: { stage: { in: closedStages } } },
          },
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

    const queuePrioritySort: Prisma.ConversationOrderByWithRelationInput[] = [
      { lead: { valueCents: { sort: "desc", nulls: "last" } } },
      { lead: { score: "desc" } },
      { lastMessageAt: "desc" },
    ];

    const orderBy: Prisma.ConversationOrderByWithRelationInput[] =
      filter === "handoff" || filter === "mine" || filter === "unassigned"
        ? queuePrioritySort
        : filter === "unread"
          ? [{ unreadCount: "desc" }, { lastMessageAt: "desc" }]
          : [{ lastMessageAt: "desc" }];

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          lead: { select: { id: true, stage: true, score: true, valueCents: true } },
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
        const stage = row.lead?.stage;
        const postCloseAttention =
          !!stage &&
          (stage === LeadStage.WON || stage === LeadStage.LOST) &&
          row.unreadCount > 0;
        return {
          ...row,
          requiresHuman: meta.requiresHuman === true,
          postCloseAttention,
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
        assignedTo: { select: { id: true, name: true, email: true } },
        whatsappAccount: {
          select: { displayPhoneNumber: true, isActive: true },
        },
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    this.assertInboxThreadAccess(user, conversation);

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: 51,
    });

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

    return this.buildConversationDetail(user, conversation, recentMessages, lastAiRun);
  }

  private async buildConversationDetail(
    user: JwtPayload,
    conversation: Prisma.ConversationGetPayload<{
      include: {
        lead: true;
        assignedTo: { select: { id: true; name: true; email: true } };
        whatsappAccount: { select: { displayPhoneNumber: true; isActive: true } };
      };
    }>,
    recentMessagesDesc: Array<{ id: string; direction: string; content: string | null; sentByAi: boolean; createdAt: Date; [key: string]: unknown }>,
    lastAiRun: {
      id: string;
      output: unknown;
      createdAt: Date;
      latencyMs: number | null;
    } | null,
  ) {
    const hasOlderMessages = recentMessagesDesc.length > 50;
    const messages = recentMessagesDesc.slice(0, 50).reverse();

    const meta = (conversation.metadata ?? {}) as Record<string, unknown>;
    const profile = (conversation.lead?.profile ?? {}) as Record<string, unknown>;

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
          customerNeeds: Array.isArray(profile.customerNeeds)
            ? profile.customerNeeds.map(String)
            : Array.isArray(runOutput.customerNeeds)
              ? runOutput.customerNeeds.map(String)
              : [],
          classifiedAt: conversation.lead.lastClassifiedAt.toISOString(),
          runId: lastAiRun?.id ?? null,
          humanCorrected: !!profile.humanCorrectedAt,
          humanCorrectedAt:
            typeof profile.humanCorrectedAt === "string" ? profile.humanCorrectedAt : null,
        }
      : null;

    return {
      ...conversation,
      messages,
      hasOlderMessages,
      replyMode: conversation.aiEnabled ? ("workspace_default" as const) : ("human_handling" as const),
      requiresHuman: meta.requiresHuman === true,
      handoffReason: typeof meta.handoffReason === "string" ? meta.handoffReason : null,
      handoffAt: typeof meta.handoffAt === "string" ? meta.handoffAt : null,
      campaignAttribution: parseCampaignAttributionMeta(meta),
      pendingDraft:
        meta.pendingDraft && typeof meta.pendingDraft === "object"
          ? (meta.pendingDraft as {
              suggestion: string;
              sources?: Array<{ title: string; citation?: string; similarity: number }>;
              aiRunId?: string;
              createdAt?: string;
            })
          : null,
      replyDecision:
        meta.replyDecision && typeof meta.replyDecision === "object"
          ? (meta.replyDecision as import("@growvisi/shared").ReplyDecision)
          : null,
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
        await tx.lead.updateMany({
          where: {
            id: conversation.leadId,
            organizationId: user.organizationId,
          },
          data: { ownerId: user.sub },
        });
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

  async sendMessage(
    user: JwtPayload,
    conversationId: string,
    content: string,
    opts?: { draftText?: string; aiRunId?: string },
  ) {
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

    this.realtime.emitMessageNew(user.organizationId, {
      conversationId,
      messageId: message.id,
      direction: "OUTBOUND",
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });
    this.realtime.emitInboxUpdated(user.organizationId);

    void this.businessEvents.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.MESSAGE_SENT,
      entityType: "message",
      entityId: message.id,
      payload: { conversationId, content: text },
    });

    if (opts?.draftText?.trim()) {
      void this.learningSignals.recordDraftFeedback({
        organizationId: user.organizationId,
        conversationId,
        aiRunId: opts.aiRunId,
        draft: opts.draftText,
        final: text,
      });
    }

    await this.suggestReplyService.clearPendingDraft(conversationId, user.organizationId);

    return message;
  }

  async sendMediaMessage(
    user: JwtPayload,
    conversationId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const mime = file.mimetype;
    const isImage = INBOX_IMAGE_MIMES.has(mime);
    const isDocument = INBOX_DOCUMENT_MIMES.has(mime);
    if (!isImage && !isDocument) {
      throw new BadRequestException("Only JPEG, PNG, WebP images and PDF documents are supported.");
    }
    if (isImage && file.size > INBOX_IMAGE_MAX_BYTES) {
      throw new BadRequestException("Images must be 5 MB or smaller.");
    }
    if (isDocument && file.size > INBOX_DOCUMENT_MAX_BYTES) {
      throw new BadRequestException("Documents must be 16 MB or smaller.");
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

    const mediaId = await this.whatsapp.uploadMedia(
      conversation.whatsappAccount,
      file.buffer,
      mime,
      file.originalname,
    );

    const trimmedCaption = caption?.trim() || undefined;
    const waMessageId = isImage
      ? await this.whatsapp.sendImage(
          conversation.whatsappAccount,
          conversation.contactPhone,
          mediaId,
          trimmedCaption,
        )
      : await this.whatsapp.sendDocument(
          conversation.whatsappAccount,
          conversation.contactPhone,
          mediaId,
          file.originalname || "document.pdf",
          trimmedCaption,
        );

    const messageType = isImage ? "IMAGE" : "DOCUMENT";
    const typeKey = messageType.toLowerCase();
    const previewContent =
      trimmedCaption ||
      (isImage ? "Image" : file.originalname || "Document");
    const payload: Record<string, unknown> = {
      [typeKey]: {
        id: mediaId,
        ...(isDocument ? { filename: file.originalname || "document.pdf" } : {}),
        ...(trimmedCaption ? { caption: trimmedCaption } : {}),
      },
    };

    const message = await this.prisma.message.create({
      data: {
        organizationId: user.organizationId,
        conversationId,
        waMessageId,
        direction: "OUTBOUND",
        type: messageType as never,
        status: "SENT",
        content: previewContent,
        payload: payload as object,
        sentByUserId: user.sub,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    await this.clearHandoffIfNeeded(conversationId, user.sub);
    await this.recordFirstResponse(conversationId, user.organizationId);

    this.realtime.emitMessageNew(user.organizationId, {
      conversationId,
      messageId: message.id,
      direction: "OUTBOUND",
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });
    this.realtime.emitInboxUpdated(user.organizationId);

    void this.businessEvents.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.MESSAGE_SENT,
      entityType: "message",
      entityId: message.id,
      payload: { conversationId, content: previewContent, type: messageType },
    });

    await this.suggestReplyService.clearPendingDraft(conversationId, user.organizationId);

    return message;
  }

  async suggestReply(user: JwtPayload, conversationId: string) {
    const draft = await this.suggestReplyService.generateAndStoreDraft(
      user.organizationId,
      conversationId,
    );
    if (!draft) {
      throw new BadRequestException("Could not generate a reply suggestion. Check AI settings.");
    }
    return draft;
  }

  async translateDraft(
    user: JwtPayload,
    conversationId: string,
    text: string,
    target: "hi" | "en",
  ) {
    await this.getById(user, conversationId);
    const translated = await this.replyComposer.translateComposerText(
      user.organizationId,
      text,
      target,
    );
    return { text: translated, target };
  }

  async getIntelligence(user: JwtPayload, conversationId: string) {
    return this.intelligenceQuery.getConversationIntelligence(user, conversationId);
  }

  /** P0 thread bundle — conversation detail + inbox AI context in one round-trip. */
  async getThreadBundle(user: JwtPayload, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      include: {
        lead: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        whatsappAccount: {
          select: { displayPhoneNumber: true, isActive: true },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    this.assertInboxThreadAccess(user, conversation);

    const stage = (conversation.lead?.stage ?? "NEW") as LeadStage;
    const messageTake = Math.max(51, resolveContextMessageLimit(stage));

    const [recentMessages, lastAiRun, memories] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: messageTake,
      }),
      this.prisma.aiRun.findFirst({
        where: {
          organizationId: user.organizationId,
          conversationId,
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
      }),
      this.prisma.conversationMemory.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    const [conversationDetail, inboxContext] = await Promise.all([
      this.buildConversationDetail(user, conversation, recentMessages, lastAiRun),
      this.intelligenceQuery.buildInboxContextForBundle(
        user.organizationId,
        conversation,
        recentMessages,
        memories,
      ),
    ]);

    return { conversation: conversationDetail, inboxContext };
  }

  async getInboxContext(user: JwtPayload, conversationId: string) {
    return this.intelligenceQuery.getConversationInboxContext(user, conversationId);
  }

  async getKnowledgeGaps(user: JwtPayload, conversationId: string) {
    return this.intelligenceQuery.getConversationKnowledgeGaps(user, conversationId);
  }

  async getReplyDecision(user: JwtPayload, conversationId: string) {
    return this.intelligenceQuery.getReplyDecision(user, conversationId);
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
    if (!aiEnabled) {
      await this.suggestReplyService.clearPendingDraft(id, user.organizationId);
    }

    await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { aiEnabled },
    });

    const updated = await this.getById(user, id);

    if (aiEnabled && updated.leadId) {
      const latestInbound = await this.prisma.message.findFirst({
        where: { conversationId: id, direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latestInbound) {
        void this.aiClassify.enqueue(
          {
            organizationId: user.organizationId,
            conversationId: id,
            messageId: latestInbound.id,
            leadId: updated.leadId,
          },
          { background: true },
        );
      }
    }

    return updated;
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

    this.realtime.emitMessageNew(user.organizationId, {
      conversationId: conversation.id,
      messageId: message.id,
      direction: "OUTBOUND",
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });
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

    const conversationIds = responded.map((c) => c.id);
    const firstInbounds =
      conversationIds.length > 0
        ? await this.prisma.message.findMany({
            where: {
              conversationId: { in: conversationIds },
              direction: "INBOUND",
            },
            orderBy: { createdAt: "asc" },
            distinct: ["conversationId"],
            select: { conversationId: true, createdAt: true },
          })
        : [];
    const firstInboundByConversation = new Map(
      firstInbounds.map((m) => [m.conversationId, m.createdAt]),
    );

    for (const conv of responded) {
      const firstInboundAt = firstInboundByConversation.get(conv.id);
      if (!firstInboundAt || !conv.firstResponseAt) continue;
      const ms = conv.firstResponseAt.getTime() - firstInboundAt.getTime();
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
