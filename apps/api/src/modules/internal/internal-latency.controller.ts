import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AiClassifyService } from "../ai/ai-classify.service";
import { PrismaService } from "../prisma/prisma.service";
import type { PipelineTurnMetrics } from "../intelligence/pipeline-spans";

@SkipThrottle()
@Controller("internal/cron")
export class InternalLatencyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classify: AiClassifyService,
  ) {}

  /**
   * Production latency probe — creates a test inbound and runs classify (no auto-send).
   * Requires CRON_SECRET + LATENCY_PROBE_ENABLED=true + explicit conversationId.
   */
  @Get("latency-probe")
  @UseGuards(CronSecretGuard)
  async latencyProbe(
    @Query("conversationId") conversationId?: string,
    @Query("message") message = "Hi",
  ) {
    if (process.env.LATENCY_PROBE_ENABLED !== "true") {
      return { ok: false, error: "probe_disabled" };
    }

    if (!conversationId?.trim()) {
      return { ok: false, error: "conversation_id_required" };
    }

    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId.trim() },
      include: { lead: true },
    });
    if (!conv) {
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
      ...(conv.lead ? { leadId: conv.lead.id } : {}),
      dryRun: true,
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

    const classifyOutput = classifyRun?.output as Record<string, unknown> | null;
    const metrics = (classifyOutput?.metrics as PipelineTurnMetrics | undefined) ?? null;

    return {
      ok: true,
      dry_run: true,
      measured_at: new Date().toISOString(),
      test_message: message,
      conversation_id: conv.id,
      process_wall_ms: processWallMs,
      outbound_preview: outbound?.content?.slice(0, 100) ?? null,
      auto_send_blocked: !outbound,
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
