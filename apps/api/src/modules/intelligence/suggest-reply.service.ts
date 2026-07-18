import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { JwtPayload, ReplyDecision } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ReplyComposerService } from "./reply-composer.service";

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
