import type {
  AiClassificationResult,
  ExecutionPath,
  KnowledgeHit,
  ReplyDecision,
  ReplyExecutionMode,
  ReplyRiskLevel,
} from "@growvisi/shared";

/** Per-turn policy + grounding observability stored on ai_runs.output.metrics. */
export interface PipelineTurnMetrics {
  executionPath: ExecutionPath;
  replyMode: ReplyExecutionMode;
  replyRisk: ReplyRiskLevel;
  replyConfidence: number;
  autoEligible: boolean;
  blockers: string[];
  knowledgeGap: boolean;
  /** Top knowledge hit similarity as 0–100, or null when no hits. */
  groundingPercent: number | null;
  /** Phase 4 — category-aware retrieval confidence 0–100. */
  retrievalConfidence: number | null;
  knowledgeHitCount: number;
  stageChanged: boolean;
  safetyBlocked: string | null;
  fastPath: boolean;
  /** Phase 2 shadow — structured judgment logged for baseline audits. */
  judgment?: {
    customerNeedsCount: number;
    language: string | null;
    dealTemperature: string | null;
    requiresOwner: boolean;
    apologyRequired: boolean;
    recoveryMode: boolean;
  };
}

export interface BuildPipelineTurnMetricsInput {
  executionPath: ExecutionPath;
  replyDecision: ReplyDecision;
  knowledgeHits: KnowledgeHit[];
  knowledgeGap: boolean;
  stageChanged: boolean;
  safetyBlocked?: { code: string };
  fastPath?: boolean;
  classification?: Pick<
    AiClassificationResult,
    | "customerNeeds"
    | "language"
    | "dealTemperature"
    | "requiresOwner"
    | "apologyRequired"
    | "recoveryMode"
  >;
  groundingConfidence?: number;
}

export function buildPipelineTurnMetrics(
  input: BuildPipelineTurnMetricsInput,
): PipelineTurnMetrics {
  const top = input.knowledgeHits[0];
  return {
    executionPath: input.executionPath,
    replyMode: input.replyDecision.mode,
    replyRisk: input.replyDecision.risk,
    replyConfidence: input.replyDecision.confidence,
    autoEligible: input.replyDecision.autoEligible ?? false,
    blockers: input.replyDecision.blockers ?? [],
    knowledgeGap: input.knowledgeGap,
    groundingPercent: top ? Math.round(top.similarity * 100) : null,
    retrievalConfidence:
      input.groundingConfidence != null
        ? Math.round(input.groundingConfidence * 100)
        : top
          ? Math.round(top.similarity * 100)
          : null,
    knowledgeHitCount: input.knowledgeHits.length,
    stageChanged: input.stageChanged,
    safetyBlocked: input.safetyBlocked?.code ?? null,
    fastPath: input.fastPath ?? false,
    judgment: input.classification
      ? {
          customerNeedsCount: input.classification.customerNeeds?.length ?? 0,
          language: input.classification.language ?? null,
          dealTemperature: input.classification.dealTemperature ?? null,
          requiresOwner: Boolean(input.classification.requiresOwner),
          apologyRequired: Boolean(input.classification.apologyRequired),
          recoveryMode: Boolean(input.classification.recoveryMode),
        }
      : undefined,
  };
}

/** Per-turn timing spans stored on ai_runs.input/output.spans for latency observability. */
export class PipelineSpans {
  private readonly origin = Date.now();
  private readonly marks = new Map<string, number>();
  readonly spans: Record<string, number> = {};

  constructor() {
    this.marks.set("start", this.origin);
  }

  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /** Record duration in ms from `from` mark to now (or `to` mark). */
  measure(name: string, from: string, to?: string): void {
    const start = this.marks.get(from);
    if (start == null) return;
    const end = to ? (this.marks.get(to) ?? Date.now()) : Date.now();
    this.spans[name] = Math.max(0, end - start);
  }

  sinceStart(): number {
    return Date.now() - this.origin;
  }

  toJSON(): Record<string, number> {
    return { ...this.spans, total_ms: this.sinceStart() };
  }
}
