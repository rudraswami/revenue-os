import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fetchWithRetry } from "../../common/http/fetch-with-timeout";

export interface RewrittenQuery {
  /** 1–3 clean English search queries derived from the customer message. */
  queries: string[];
  /** Detected customer language for reply mirroring. */
  language: "en" | "hi" | "hinglish" | "mixed";
  /** True when the LLM rewrite succeeded (false = raw-message fallback). */
  rewritten: boolean;
}

/**
 * Converts a raw customer message (often Hinglish, vague, or multi-part) into
 * clean English search queries BEFORE retrieval. This is the single biggest
 * retrieval-quality lever for informal WhatsApp messages: "aap kya karte ho?"
 * becomes "what services does the business offer", which embeds close to the
 * knowledge base instead of missing entirely.
 *
 * Fast and cheap by design: one gpt-4o-mini call, one field of output, tight
 * timeout, no retry loop. On ANY failure we fall back to the raw message so
 * retrieval always runs.
 */
@Injectable()
export class QueryRewriteService {
  private readonly logger = new Logger(QueryRewriteService.name);

  constructor(private readonly config: ConfigService) {}

  async rewrite(
    lastInbound: string,
    recentContext?: string,
  ): Promise<RewrittenQuery> {
    const fallback: RewrittenQuery = {
      queries: [lastInbound.slice(0, 300)],
      language: "en",
      rewritten: false,
    };

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey || !lastInbound.trim()) return fallback;

    // Short courtesy messages don't need retrieval rewriting.
    if (lastInbound.trim().length < 8) return fallback;

    try {
      const res = await fetchWithRetry(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.get<string>("AI_QUERY_REWRITE_MODEL") ?? "gpt-4o-mini",
            temperature: 0,
            max_tokens: 180,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: [
                  "You convert a customer's WhatsApp message into knowledge-base search queries for an Indian small business.",
                  "Return JSON: {\"queries\": string[], \"language\": \"en\"|\"hi\"|\"hinglish\"|\"mixed\"}.",
                  "Rules:",
                  "- 1 to 3 queries, each a short clean ENGLISH phrase describing what the customer wants to know (translate Hindi/Hinglish).",
                  "- Split multi-part questions into separate queries (price AND delivery = 2 queries).",
                  "- Expand vague asks into concrete business topics: \"what do you do?\" → \"services and products offered\".",
                  "- Resolve pronouns using the conversation context (\"how much is it?\" → name the product).",
                  "- Never return empty queries. Never answer the question — only produce search queries.",
                ].join("\n"),
              },
              {
                role: "user",
                content: recentContext
                  ? `Recent conversation:\n${recentContext.slice(0, 600)}\n\nCustomer message: "${lastInbound.slice(0, 500)}"`
                  : `Customer message: "${lastInbound.slice(0, 500)}"`,
              },
            ],
          }),
        },
        // One attempt, tight cap — a failed rewrite must never stall the reply.
        { timeoutMs: 6_000, attempts: 1, baseDelayMs: 0 },
      );

      if (!res.ok) return fallback;

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = body.choices?.[0]?.message?.content;
      if (!raw) return fallback;

      const parsed = JSON.parse(raw) as {
        queries?: unknown;
        language?: unknown;
      };
      const queries = Array.isArray(parsed.queries)
        ? parsed.queries
            .map((q) => String(q).trim())
            .filter((q) => q.length > 2)
            .slice(0, 3)
        : [];
      if (queries.length === 0) return fallback;

      const language =
        parsed.language === "hi" ||
        parsed.language === "hinglish" ||
        parsed.language === "mixed"
          ? parsed.language
          : "en";

      return { queries, language, rewritten: true };
    } catch (err) {
      this.logger.debug(
        `Query rewrite failed (${err instanceof Error ? err.message : err}) — using raw message`,
      );
      return fallback;
    }
  }
}
