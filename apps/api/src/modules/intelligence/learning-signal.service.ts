import { Injectable } from "@nestjs/common";
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
        },
      },
    });
  }

  async recordAutoSend(opts: {
    organizationId: string;
    conversationId: string;
    aiRunId?: string;
    preview: string;
  }) {
    await this.prisma.learningSignal.create({
      data: {
        organizationId: opts.organizationId,
        conversationId: opts.conversationId,
        aiRunId: opts.aiRunId,
        type: "auto_send",
        signal: "auto_reply_sent",
        metadata: { previewLength: opts.preview.length } as object,
      },
    });
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
