import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import type { AiClassificationResult, LeadStage } from "@growvisi/shared";
import { LEAD_STAGE_ORDER, QUEUES } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationsService } from "../automations/automations.service";
import { AssignmentService } from "../assignments/assignment.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import { EntitlementsService } from "../billing/entitlements.service";
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
    private readonly automations: AutomationsService,
    private readonly entitlements: EntitlementsService,
    private readonly assignments: AssignmentService,
    private readonly webhooks: WebhookDispatchService,
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
    await this.entitlements.assertHasAccess(data.organizationId);

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

    if (!conversation.aiEnabled) {
      this.logger.debug(`AI disabled for conversation ${data.conversationId} — skipping`);
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

      const prefs = await this.automations.getPreferencesForOrg(data.organizationId);
      const stageChanged = await this.applyClassification(
        data.organizationId,
        lead.id,
        lead.stage as LeadStage,
        result,
        aiRun.id,
        prefs.stage,
      );

      if (result.requiresHuman) {
        const conv = await this.prisma.conversation.findUnique({
          where: { id: data.conversationId },
          select: { metadata: true },
        });
        const existingMeta =
          conv?.metadata && typeof conv.metadata === "object" ? conv.metadata : {};
        await this.prisma.conversation.update({
          where: { id: data.conversationId },
          data: {
            metadata: {
              ...(existingMeta as Record<string, unknown>),
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

        const assigneeUserId = await this.assignments.applyAutoAssign(data.organizationId, {
          conversationId: data.conversationId,
          leadId: lead.id,
          handoff: true,
          reason: result.intent,
        });

        void this.automations.handleHandoff({
          organizationId: data.organizationId,
          conversationId: data.conversationId,
          leadId: lead.id,
          leadName: lead.displayName,
          leadPhone: lead.phone,
          reason: result.intent || result.summary || "Complex or sensitive request",
          assigneeUserId,
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

      const score = Math.max(
        STAGE_SCORE[result.stage],
        Math.round(result.confidence * 100),
      );
      void this.automations.handlePostClassification({
        organizationId: data.organizationId,
        conversationId: data.conversationId,
        leadId: lead.id,
        leadName: lead.displayName,
        leadPhone: lead.phone,
        score,
        stageChanged,
        newStage: result.stage,
      });
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
            content: `You are an AI revenue agent for Growvisi — classifying WhatsApp sales conversations for Indian SMBs.
The business may use Meta Business Agent to reply inside WhatsApp. Analyze the full thread to infer sales intent, pipeline stage, and what the team should do next.

Return JSON with these keys:
- stage: one of ${stages}
- confidence: 0-1
- intent: short intent phrase (e.g. "Pricing inquiry", "Ready to buy", "Complaint")
- sentiment: "positive" | "neutral" | "negative"
- suggestedActions: array of 1-3 concrete next steps for the sales team
- requiresHuman: true if customer asks for a person, is angry, payment dispute, or request is too complex
- summary: 1-2 sentence summary of what happened in this conversation so far
- tags: array of 1-4 short tags that describe this lead (e.g. "high-intent", "price-sensitive", "returning-customer", "urgent", "bulk-order")
- nextAction: the single most important thing the sales rep should do right now (e.g. "Send pricing PDF", "Call within 2 hours", "Follow up on delivery status")

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
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 4) : [],
      nextAction: typeof parsed.nextAction === "string" ? parsed.nextAction.slice(0, 200) : undefined,
    };
  }

  private async autoAssignTags(organizationId: string, leadId: string, tagNames: string[]) {
    for (const name of tagNames) {
      const clean = name.trim().toLowerCase().slice(0, 40);
      if (!clean) continue;
      try {
        const tag = await this.prisma.tag.upsert({
          where: { organizationId_name: { organizationId, name: clean } },
          create: { organizationId, name: clean, color: "#006c49" },
          update: {},
        });
        await this.prisma.leadTag.upsert({
          where: { leadId_tagId: { leadId, tagId: tag.id } },
          create: { leadId, tagId: tag.id },
          update: {},
        });
      } catch {
        // Tag creation can race — safe to skip
      }
    }
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
    autoStageEnabled = true,
  ): Promise<boolean> {
    const updateStage =
      autoStageEnabled && this.shouldUpdateStage(currentStage, result.stage, result.confidence);
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
          summary: result.summary,
          nextAction: result.nextAction,
          aiTags: result.tags,
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

    if (result.tags?.length) {
      await this.autoAssignTags(organizationId, leadId, result.tags);
    }

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

      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true, displayName: true },
      });
      void this.webhooks.emit(organizationId, "lead.stage.changed", {
        leadId,
        fromStage: currentStage,
        toStage: result.stage,
        phone: lead?.phone,
        displayName: lead?.displayName,
        isAi: true,
        at: new Date().toISOString(),
      });
      return true;
    }

    return false;
  }
}
