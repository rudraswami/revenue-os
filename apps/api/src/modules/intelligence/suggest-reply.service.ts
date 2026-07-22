import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { JwtPayload, ReplyDecision } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import type { PipelineContext } from "./pipeline-context";
import { ReplyComposerService } from "./reply-composer.service";

/**
 * Safe holding reply used only when live generation fails on the automated
 * pipeline, so a real customer question never results in total silence. A human
 * can send it as-is or replace it.
 */
const FALLBACK_DRAFT_TEXT =
  "Thanks for your message! Let me confirm the details and get right back to you shortly.";

export interface DraftReplyResult {
  suggestion: string;
  sources: Array<{
    chunkId: string;
    title: string;
    similarity: number;
    citation: string;
  }>;
  usedRag: boolean;
  aiRunId: string;
  decision?: ReplyDecision;
}

@Injectable()
export class SuggestReplyService {
  private readonly logger = new Logger(SuggestReplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly composer: ReplyComposerService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async suggest(user: JwtPayload, conversationId: string) {
    return this.generateAndStoreDraft(user.organizationId, conversationId, { manual: true });
  }

  async generateAndStoreDraft(
    organizationId: string,
    conversationId: string,
    opts?: {
      knowledgeGap?: boolean;
      decision?: ReplyDecision;
      manual?: boolean;
      classification?: import("@growvisi/shared").AiClassificationResult | null;
      pipelineContext?: PipelineContext;
      fastReplyText?: string;
    },
  ): Promise<DraftReplyResult | null> {
    try {
      const draft = await this.composer.compose({
        organizationId,
        conversationId,
        knowledgeGap: opts?.knowledgeGap,
        decision: opts?.decision,
        manual: opts?.manual,
        classification: opts?.classification,
        pipelineContext: opts?.pipelineContext,
        fastReplyText: opts?.fastReplyText,
      });

      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        select: { metadata: true },
      });
      if (!conversation) return { ...draft, decision: opts?.decision };

      const meta =
        conversation.metadata && typeof conversation.metadata === "object"
          ? (conversation.metadata as Record<string, unknown>)
          : {};

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          metadata: {
            ...meta,
            pendingDraft: {
              suggestion: draft.suggestion,
              sources: draft.sources,
              aiRunId: draft.aiRunId,
              createdAt: new Date().toISOString(),
              decision: opts?.decision ?? meta.replyDecision,
            },
          } as object,
        },
      });

      this.realtime.emitInboxUpdated(organizationId, conversationId);
      return { ...draft, decision: opts?.decision };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Draft generation failed for ${conversationId}: ${message}`);
      // Manual "Suggest" surfaces the error to the user; leave it to their UI.
      // For the automated pipeline, never leave the thread silent — store a safe
      // holding draft a human can send, unless a draft is already waiting.
      if (opts?.manual) return null;
      return this.storeFallbackDraft(organizationId, conversationId, opts?.decision);
    }
  }

  private async storeFallbackDraft(
    organizationId: string,
    conversationId: string,
    decision?: ReplyDecision,
  ): Promise<DraftReplyResult | null> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        select: { metadata: true },
      });
      if (!conversation) return null;

      const meta =
        conversation.metadata && typeof conversation.metadata === "object"
          ? (conversation.metadata as Record<string, unknown>)
          : {};
      // Don't clobber a draft the team may already be reviewing.
      if (meta.pendingDraft) return null;

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          metadata: {
            ...meta,
            pendingDraft: {
              suggestion: FALLBACK_DRAFT_TEXT,
              sources: [],
              createdAt: new Date().toISOString(),
              decision: decision ?? meta.replyDecision,
              fallback: true,
            },
          } as object,
        },
      });

      this.realtime.emitInboxUpdated(organizationId, conversationId);
      return {
        suggestion: FALLBACK_DRAFT_TEXT,
        sources: [],
        usedRag: false,
        aiRunId: "",
        decision,
      };
    } catch (err) {
      this.logger.warn(
        `Fallback draft store failed for ${conversationId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async clearPendingDraft(conversationId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { metadata: true },
    });
    if (!conversation) return;

    const meta =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};
    if (!meta.pendingDraft) return;

    const { pendingDraft: _removed, ...rest } = meta;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: rest as object },
    });
  }
}
