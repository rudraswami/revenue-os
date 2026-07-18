import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import {
  formatMarketingFaqForPrompt,
  MARKETING_HELP_EXCERPT,
  MARKETING_HELP_FAQ,
} from "./marketing-help-knowledge";

import { MarketingInquiryService } from "./marketing-inquiry.service";

type HistoryTurn = { role: "user" | "assistant"; content: string };

function shouldLogInquiry(message: string, escalate: boolean): boolean {
  return (
    escalate ||
    /demo|trial|pric|plan|enterprise|agency|operator|buy|sign\s*up|cost|quote|setup|whatsapp/i.test(
      message,
    )
  );
}

@Injectable()
export class MarketingHelpService {
  constructor(
    private readonly config: ConfigService,
    private readonly inquiries: MarketingInquiryService,
  ) {}

  getCapabilities() {
    return {
      marketingHelpLlm: !!this.config.get<string>("OPENAI_API_KEY")?.trim(),
    };
  }

  /** Keyword fallback when LLM is offline */
  matchFaq(message: string): string | null {
    const q = message.toLowerCase();
    for (const item of MARKETING_HELP_FAQ) {
      const words = item.q.toLowerCase().split(/\s+/);
      if (words.some((w) => w.length > 4 && q.includes(w))) return item.a;
    }
    if (/price|cost|plan|₹|rupee|billing|razorpay/.test(q)) {
      return MARKETING_HELP_FAQ.find((f) => f.id === "pricing")!.a;
    }
    if (/auto|bot|reply/.test(q)) {
      return MARKETING_HELP_FAQ.find((f) => f.id === "auto-reply")!.a;
    }
    if (/trial|free|credit/.test(q)) {
      return MARKETING_HELP_FAQ.find((f) => f.id === "trial")!.a;
    }
    if (/setup|connect|meta|token|whatsapp/.test(q)) {
      return MARKETING_HELP_FAQ.find((f) => f.id === "setup")!.a;
    }
    if (/your turn|handoff|human/.test(q)) {
      return MARKETING_HELP_FAQ.find((f) => f.id === "your-turn")!.a;
    }
    return null;
  }

  async chat(input: {
    message: string;
    history?: HistoryTurn[];
    locale?: "en" | "hi";
    page?: string;
  }) {
    const message = input.message.trim();
    if (!message) {
      throw new BadRequestException("Enter a question.");
    }

    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      const fallback = this.matchFaq(message);
      if (fallback) {
        const escalateSuggested = /setup|sales|demo|enterprise/i.test(message);
        const result = {
          available: false,
          reply: fallback,
          escalateSuggested,
          source: "faq" as const,
        };
        if (shouldLogInquiry(message, escalateSuggested)) {
          this.inquiries.record({
            kind: "ai_chat",
            message,
            page: input.page,
            locale: input.locale,
            assistantReply: fallback,
            escalate: escalateSuggested,
          });
        }
        return result;
      }
      throw new ServiceUnavailableException(
        "Assistant is offline — message us on WhatsApp or email support@growvisi.in.",
      );
    }

    const locale = input.locale === "hi" ? "hi" : "en";
    const history = (input.history ?? []).slice(-4);

    const systemPrompt = [
      "You are Growvisi Site Assistant on growvisi.in — answer product, pricing, and trial questions for Indian SMB buyers.",
      "SCOPE: Growvisi features, YOUR TURN, pricing in INR, trial, Meta WhatsApp setup overview, how Growvisi differs from broadcast tools.",
      "NEVER: promise Growvisi auto-replies to the buyer's customers, invent case studies or metrics, or give legal/tax advice.",
      "NEVER: pretend to be human sales — say a human can help on WhatsApp for demos and Meta setup.",
      locale === "hi"
        ? "Reply in simple Hindi when asked; keep product terms in English when natural."
        : "Reply in clear, concise English (2–4 sentences).",
      "If they want a demo, enterprise pricing, or Meta token help, suggest WhatsApp or support@growvisi.in.",
      "",
      MARKETING_HELP_EXCERPT,
      "",
      "=== FAQ ===",
      formatMarketingFaqForPrompt(),
    ].join("\n");

    const model =
      this.config.get<string>("AI_MARKETING_HELP_MODEL") ??
      this.config.get<string>("AI_CHAT_MODEL") ??
      "gpt-4o-mini";

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.map((t) => ({ role: t.role, content: t.content.slice(0, 600) })),
      { role: "user", content: message },
    ];

    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          max_tokens: 350,
          messages,
        }),
      },
      20_000,
    );

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const fallback = this.matchFaq(message);
      if (fallback) {
        return {
          available: true,
          reply: fallback,
          escalateSuggested: true,
          source: "faq" as const,
        };
      }
      throw new BadRequestException(body.error?.message ?? "Assistant could not respond.");
    }

    const reply = body.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new BadRequestException("No response from assistant.");
    }

    const escalateSuggested =
      /whatsapp|support@growvisi|demo|sales|setup call|enterprise|contact us/i.test(reply) ||
      /demo|enterprise|setup|token|sales|pricing for agency/i.test(message);

    if (shouldLogInquiry(message, escalateSuggested)) {
      this.inquiries.record({
        kind: "ai_chat",
        message,
        page: input.page,
        locale: input.locale,
        assistantReply: reply,
        escalate: escalateSuggested,
      });
    }

    return {
      available: true,
      reply,
      escalateSuggested,
      source: "llm" as const,
    };
  }
}
