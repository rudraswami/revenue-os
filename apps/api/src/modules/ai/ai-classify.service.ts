import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import type { AiClassificationResult, LeadStage } from "@growvisi/shared";
import { LEAD_STAGE_ORDER, QUEUES } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

export interface ClassifyJobData {
  organizationId: string;
  conversationId: string;
  messageId: string;
  leadId: string;
}

const STAGE_SCORE: Record<LeadStage, number> = {
  NEW: 10,
  CONTACTED: 25,
  QUALIFIED: 50,
  PROPOSAL: 70,
  NEGOTIATION: 85,
  WON: 100,
  LOST: 0,
};

@Injectable()
export class AiClassifyService {
  private readonly logger = new Logger(AiClassifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeGateway,
    @InjectQueue(QUEUES.AI_CLASSIFY) private readonly classifyQueue: Queue,
  ) {}

  async enqueue(data: ClassifyJobData) {
    if (process.env.VERCEL === "1") {
      await this.process(data);
      return;
    }

    const jobId = createHash("sha256")
      .update(`${data.organizationId}:${data.messageId}`)
      .digest("hex");

    await this.classifyQueue.add("classify", data, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  }

  async process(data: ClassifyJobData) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.debug("OPENAI_API_KEY not set — skipping classification");
      return;
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: data.conversationId, organizationId: data.organizationId },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "desc" }, take: 16 },
      },
    });

    if (!conversation?.lead) {
      this.logger.warn(`No lead for conversation ${data.conversationId}`);
      return;
    }

    const lead = conversation.lead;
    if (lead.stage === "WON" || lead.stage === "LOST") {
      return;
    }

    const ordered = [...conversation.messages].reverse();
    const transcript = ordered
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

    if (!transcript.trim()) {
      return;
    }

    const model = this.config.get<string>("AI_CLASSIFY_MODEL") ?? "gpt-4o-mini";
    const started = Date.now();

    const aiRun = await this.prisma.aiRun.create({
      data: {
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        type: "classify",
        provider: "openai",
        model,
        status: "RUNNING",
        input: { messageId: data.messageId, leadId: data.leadId },
      },
    });

    try {
      const result = await this.callOpenAi(apiKey, model, lead.stage as LeadStage, transcript);
      const latencyMs = Date.now() - started;

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "COMPLETED",
          output: result as object,
          latencyMs,
          completedAt: new Date(),
        },
      });

      const stageChanged = await this.applyClassification(
        data.organizationId,
        lead.id,
        lead.stage as LeadStage,
        result,
        aiRun.id,
      );

      if (result.requiresHuman) {
        await this.prisma.conversation.update({
          where: { id: data.conversationId },
          data: {
            metadata: {
              requiresHuman: true,
              handoffReason: result.intent,
              handoffAt: new Date().toISOString(),
            },
          },
        });
        this.realtime.emitLeadHandoff(data.organizationId, {
          conversationId: data.conversationId,
          leadId: lead.id,
          reason: result.intent,
        });
      }

      this.realtime.emitLeadClassified(data.organizationId, {
        leadId: lead.id,
        conversationId: data.conversationId,
        stage: result.stage,
        confidence: result.confidence,
        stageChanged,
      });

      if (stageChanged) {
        this.realtime.emitInboxUpdated(data.organizationId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      });
      throw error;
    }
  }

  private async callOpenAi(
    apiKey: string,
    model: string,
    currentStage: LeadStage,
    transcript: string,
  ): Promise<AiClassificationResult> {
    const stages = LEAD_STAGE_ORDER.join(", ");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You classify WhatsApp sales conversations for an Indian SMB.
Return JSON only with keys: stage, confidence, intent, sentiment, suggestedActions, requiresHuman.
stage must be one of: ${stages}.
confidence is 0-1. requiresHuman is true if the customer asks for a person, is angry, or the request is too complex for AI.
Current pipeline stage: ${currentStage}.`,
          },
          {
            role: "user",
            content: `Classify this conversation:\n\n${transcript}`,
          },
        ],
      }),
    });

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(body.error?.message ?? "OpenAI classification failed");
    }

    const raw = body.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("No classification returned");
    }

    const parsed = JSON.parse(raw) as Partial<AiClassificationResult>;
    const stage = this.normalizeStage(parsed.stage);
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));

    return {
      stage,
      confidence,
      intent: String(parsed.intent ?? "General inquiry"),
      sentiment: parsed.sentiment ?? "neutral",
      suggestedActions: Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions.map(String)
        : [],
      requiresHuman: Boolean(parsed.requiresHuman),
    };
  }

  private normalizeStage(value: unknown): LeadStage {
    const stage = String(value ?? "NEW").toUpperCase() as LeadStage;
    return LEAD_STAGE_ORDER.includes(stage) ? stage : "NEW";
  }

  private shouldUpdateStage(
    current: LeadStage,
    suggested: LeadStage,
    confidence: number,
  ): boolean {
    if (current === "WON" || current === "LOST") return false;
    if (confidence < 0.55) return false;
    if (suggested === "LOST" && confidence >= 0.65) return true;
    if (suggested === "WON" && confidence >= 0.75) return true;

    const currentIdx = LEAD_STAGE_ORDER.indexOf(current);
    const suggestedIdx = LEAD_STAGE_ORDER.indexOf(suggested);
    if (suggested === "LOST" || suggested === "WON") {
      return confidence >= 0.7;
    }
    return suggestedIdx > currentIdx;
  }

  private async applyClassification(
    organizationId: string,
    leadId: string,
    currentStage: LeadStage,
    result: AiClassificationResult,
    aiRunId: string,
  ): Promise<boolean> {
    const updateStage = this.shouldUpdateStage(currentStage, result.stage, result.confidence);
    const score = Math.max(
      STAGE_SCORE[result.stage],
      Math.round(result.confidence * 100),
    );

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        score,
        aiConfidence: result.confidence,
        lastClassifiedAt: new Date(),
        profile: {
          lastIntent: result.intent,
          lastSentiment: result.sentiment,
          suggestedActions: result.suggestedActions,
        },
        ...(updateStage
          ? {
              stage: result.stage as never,
              wonAt: result.stage === "WON" ? new Date() : undefined,
              lostAt: result.stage === "LOST" ? new Date() : undefined,
            }
          : {}),
      },
    });

    if (updateStage) {
      await this.prisma.leadStageHistory.create({
        data: {
          leadId,
          fromStage: currentStage as never,
          toStage: result.stage as never,
          reason: `AI: ${result.intent} (${Math.round(result.confidence * 100)}% confidence)`,
          aiRunId,
        },
      });
      this.realtime.emitLeadStageChanged(organizationId, {
        leadId,
        fromStage: currentStage,
        toStage: result.stage,
        confidence: result.confidence,
      });
      return true;
    }

    return false;
  }
}
