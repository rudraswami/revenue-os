import { Injectable } from "@nestjs/common";
import { buildAutonomyMetricsSnapshot, type AutonomyMetricsSnapshot } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LearningSignalService {
  constructor(private readonly prisma: PrismaService) {}

  async recordDraftFeedback(opts: {
    organizationId: string;
    conversationId: string;
    aiRunId?: string;
    draft: string;
    final: string;
  }) {
    const draft = opts.draft.trim();
    const finalText = opts.final.trim();
    if (!draft || !finalText) return;

    let signal: "draft_used_as_is" | "draft_heavily_edited" | "draft_rejected";
    if (finalText === draft) {
      signal = "draft_used_as_is";
    } else if (finalText.length < draft.length * 0.35 || !this.overlapRatio(draft, finalText)) {
      signal = "draft_rejected";
    } else if (this.editDistanceRatio(draft, finalText) > 0.35) {
      signal = "draft_heavily_edited";
    } else {
      signal = "draft_used_as_is";
    }

    await this.prisma.learningSignal.create({
      data: {
        organizationId: opts.organizationId,
        conversationId: opts.conversationId,
        aiRunId: opts.aiRunId,
        type: "draft_feedback",
        signal,
        metadata: {
          draftLength: draft.length,
          finalLength: finalText.length,
          draftText: draft.slice(0, 500),
          finalText: finalText.slice(0, 500),
        },
      },
    });
  }

  async recordAutoSend(opts: {
    organizationId: string;
    conversationId: string;
    aiRunId?: string;
    preview: string;
    intent?: string;
  }) {
    await this.prisma.learningSignal.create({
      data: {
        organizationId: opts.organizationId,
        conversationId: opts.conversationId,
        aiRunId: opts.aiRunId,
        type: "auto_send",
        signal: "auto_reply_sent",
        metadata: {
          previewLength: opts.preview.length,
          intent: opts.intent ?? null,
        } as object,
      },
    });
  }

  async recordTrustRailBlock(opts: {
    organizationId: string;
    conversationId: string;
    aiRunId?: string;
    blocker: string;
    reason?: string;
    intentKind?: string;
  }) {
    await this.prisma.learningSignal.create({
      data: {
        organizationId: opts.organizationId,
        conversationId: opts.conversationId,
        aiRunId: opts.aiRunId,
        type: "trust_rail_block",
        signal: opts.blocker,
        metadata: {
          reason: opts.reason ?? null,
          intentKind: opts.intentKind ?? null,
        } as object,
      },
    });
  }

  /** Rolling autonomy metrics for digest and Intelligence dashboard. */
  async aggregateAutonomyMetrics(
    organizationId: string,
    periodDays = 7,
  ): Promise<AutonomyMetricsSnapshot> {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [classifyRuns, learningSignals] = await Promise.all([
      this.prisma.aiRun.findMany({
        where: {
          organizationId,
          type: "classify",
          status: "COMPLETED",
          createdAt: { gte: since },
        },
        select: { output: true },
        take: 5000,
      }),
      this.prisma.learningSignal.findMany({
        where: {
          organizationId,
          createdAt: { gte: since },
          type: { in: ["draft_feedback", "auto_send", "trust_rail_block"] },
        },
        select: { type: true, signal: true },
        take: 5000,
      }),
    ]);

    let autoSent = 0;
    let draftsPlanned = 0;
    const blockerCounts: Record<string, number> = {};

    for (const run of classifyRuns) {
      const output =
        run.output && typeof run.output === "object"
          ? (run.output as Record<string, unknown>)
          : {};
      const metrics =
        output.metrics && typeof output.metrics === "object"
          ? (output.metrics as Record<string, unknown>)
          : {};
      const mode = metrics.replyMode;
      if (mode === "send") autoSent += 1;
      if (mode === "draft") draftsPlanned += 1;
      const blockers = metrics.blockers;
      if (Array.isArray(blockers)) {
        for (const code of blockers) {
          if (typeof code === "string" && code.trim()) {
            blockerCounts[code] = (blockerCounts[code] ?? 0) + 1;
          }
        }
      }
    }

    let draftUsedAsIs = 0;
    let draftHeavilyEdited = 0;
    let draftRejected = 0;
    for (const row of learningSignals) {
      if (row.type === "trust_rail_block" && row.signal?.trim()) {
        blockerCounts[row.signal] = (blockerCounts[row.signal] ?? 0) + 1;
        continue;
      }
      if (row.type === "auto_send") continue;
      if (row.signal === "draft_used_as_is") draftUsedAsIs += 1;
      else if (row.signal === "draft_heavily_edited") draftHeavilyEdited += 1;
      else if (row.signal === "draft_rejected") draftRejected += 1;
    }

    return buildAutonomyMetricsSnapshot({
      periodDays,
      classifiedTurns: classifyRuns.length,
      autoSent,
      draftsPlanned,
      draftUsedAsIs,
      draftHeavilyEdited,
      draftRejected,
      blockerCounts,
    });
  }

  /**
   * Fetch recent draft edits where the human corrected the AI's reply. These
   * become "voice exemplars" — the composer injects them as few-shot examples
   * so the LLM adopts the brand's actual tone instead of generic AI prose.
   */
  async getVoiceExemplars(
    organizationId: string,
    limit = 3,
  ): Promise<Array<{ draft: string; final: string; createdAt: Date }>> {
    const signals = await this.prisma.learningSignal.findMany({
      where: {
        organizationId,
        type: "draft_feedback",
        signal: { in: ["draft_heavily_edited", "draft_used_as_is"] },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      select: { metadata: true, createdAt: true },
    });

    const exemplars: Array<{ draft: string; final: string; createdAt: Date }> = [];
    for (const s of signals) {
      const meta = s.metadata && typeof s.metadata === "object"
        ? (s.metadata as Record<string, unknown>)
        : {};
      const draft = typeof meta.draftText === "string" ? meta.draftText : "";
      const final = typeof meta.finalText === "string" ? meta.finalText : "";
      if (draft && final && draft !== final) {
        exemplars.push({ draft, final, createdAt: s.createdAt });
        if (exemplars.length >= limit) break;
      }
    }
    return exemplars;
  }

  private overlapRatio(a: string, b: string): boolean {
    const aw = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
    const bw = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
    if (aw.size === 0 || bw.size === 0) return false;
    let overlap = 0;
    for (const w of aw) if (bw.has(w)) overlap += 1;
    return overlap / aw.size >= 0.4;
  }

  private editDistanceRatio(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    const dist = this.levenshtein(a, b);
    return dist / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }
}
