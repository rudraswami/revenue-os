import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AiClassifyService } from "../ai/ai-classify.service";
import { PrismaService } from "../prisma/prisma.service";
import type { PipelineTurnMetrics } from "../intelligence/pipeline-spans";

const DEFAULT_CONVERSATION_ID = "cmrq48t840002lb04e1yd6532";

@SkipThrottle()
@Controller("internal/cron")
export class InternalLatencyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classify: AiClassifyService,
  ) {}

  /**
   * Production latency probe — creates a test inbound and runs the full classify pipeline.
   * Protected by CRON_SECRET. Does not simulate Meta webhooks.
   */
  @Get("latency-probe")
  @UseGuards(CronSecretGuard)
  async latencyProbe(
    @Query("conversationId") conversationId = DEFAULT_CONVERSATION_ID,
    @Query("message") message = "Hi",
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId },
      include: { lead: true },
    });
    if (!conv?.lead) {
      return { ok: false, error: "conversation_not_found" };
    }

    const waMessageId = `wamid.latency_probe_${Date.now()}`;
    const pipelineStart = Date.now();

    const inbound = await this.prisma.message.create({
      data: {
        organizationId: conv.organizationId,
        conversationId: conv.id,
        waMessageId,
        direction: "INBOUND",
        type: "TEXT",
        status: "DELIVERED",
        content: message,
        sentByAi: false,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { lastInboundAt: new Date(), lastMessageAt: new Date() },
    });

    const processStart = Date.now();
    await this.classify.process({
      organizationId: conv.organizationId,
      conversationId: conv.id,
      messageId: inbound.id,
      leadId: conv.lead.id,
    });
    const processWallMs = Date.now() - processStart;

    const outbound = await this.prisma.message.findFirst({
      where: {
        conversationId: conv.id,
        direction: "OUTBOUND",
        sentByAi: true,
        createdAt: { gt: inbound.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });

    const classifyRun = await this.prisma.aiRun.findFirst({
      where: {
        conversationId: conv.id,
        type: "classify",
        createdAt: { gte: new Date(pipelineStart) },
      },
      orderBy: { createdAt: "desc" },
    });

    const composeRun = await this.prisma.aiRun.findFirst({
      where: {
        conversationId: conv.id,
        type: "suggest_reply",
        createdAt: { gte: new Date(pipelineStart) },
      },
      orderBy: { createdAt: "desc" },
    });

    const customerE2eMs = outbound
      ? outbound.createdAt.getTime() - inbound.createdAt.getTime()
      : null;

    const classifyOutput = classifyRun?.output as Record<string, unknown> | null;
    const metrics = (classifyOutput?.metrics as PipelineTurnMetrics | undefined) ?? null;

    return {
      ok: true,
      measured_at: new Date().toISOString(),
      test_message: message,
      conversation_id: conv.id,
      process_wall_ms: processWallMs,
      customer_e2e_ms: customerE2eMs,
      outbound_preview: outbound?.content?.slice(0, 100) ?? null,
      execution_path:
        classifyOutput?.executionPath ?? classifyOutput?.fastPath ?? metrics?.executionPath ?? null,
      spans: classifyOutput?.spans ?? (composeRun?.input as Record<string, unknown> | null)?.spans ?? null,
      metrics,
      reply_mode: metrics?.replyMode ?? null,
      blockers: metrics?.blockers ?? [],
      grounding_percent: metrics?.groundingPercent ?? null,
      classify_run: classifyRun
        ? {
            id: classifyRun.id,
            latencyMs: classifyRun.latencyMs,
            status: classifyRun.status,
            output: classifyRun.output,
          }
        : null,
      compose_run: composeRun
        ? {
            id: composeRun.id,
            latencyMs: composeRun.latencyMs,
            provider: composeRun.provider,
            model: composeRun.model,
            output: composeRun.output,
          }
        : null,
    };
  }
}
