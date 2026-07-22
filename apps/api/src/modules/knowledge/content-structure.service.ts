import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { KnowledgeCategory } from "@growvisi/shared";
import { KNOWLEDGE_CATEGORIES } from "@growvisi/shared";
import { fetchWithRetry } from "../../common/http/fetch-with-timeout";
import type { CrawledPage } from "./website-crawl.service";

export interface ExtractedItem {
  title: string;
  category: KnowledgeCategory;
  content: string;
  confidence: number;
  sourceUrl: string;
}

const SYSTEM_PROMPT = `You are a business knowledge extractor for an AI sales assistant.

Given webpage content, extract ALL meaningful business knowledge that would help an AI answer customer questions over WhatsApp.

Extract into structured items, each with:
- title: Short descriptive title (e.g. "Product Pricing", "Return Policy", "Business Hours")
- category: One of: ${KNOWLEDGE_CATEGORIES.join(", ")}
- content: The actual knowledge formatted as clear Q&A pairs or bullet points. Include specific details — prices, timelines, conditions, phone numbers, addresses.
- confidence: 0.0-1.0 how confident you are this is useful business knowledge (not navigation, legal boilerplate, or generic marketing)

RULES:
- Extract SPECIFIC facts: prices in ₹, hours, addresses, phone numbers, policies, product details
- Combine related items (don't create separate items for each product variant — group them)
- Format content as clear, concise text an AI can use to answer questions
- Skip: cookie notices, privacy policies (unless specifically a business policy), generic marketing copy, navigation text
- For pricing, always include currency (₹) and any conditions/validity
- For services/products, include what's included, pricing if available, duration, availability
- Each item should be self-contained — an AI reading just that item should understand the full context

Respond with a JSON array. Example:
[
  {
    "title": "Product Pricing",
    "category": "pricing",
    "content": "## Product Pricing\\n\\n- Basic Plan: ₹999/mo — includes 5 users, 1000 messages\\n- Pro Plan: ₹2,499/mo — includes 20 users, unlimited messages, priority support\\n- Enterprise: Custom pricing — contact sales",
    "confidence": 0.95
  },
  {
    "title": "Business Hours & Location",
    "category": "contact",
    "content": "## Business Hours\\n\\nMon-Sat: 9:00 AM - 7:00 PM IST\\nSunday: Closed\\n\\n## Location\\n123 MG Road, Bengaluru, Karnataka 560001\\nPhone: +91 80 1234 5678",
    "confidence": 0.90
  }
]`;

@Injectable()
export class ContentStructureService {
  private readonly logger = new Logger(ContentStructureService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Process multiple crawled pages in batches, extracting structured
   * knowledge items using GPT-4o-mini for cost efficiency.
   */
  async extractFromPages(pages: CrawledPage[]): Promise<ExtractedItem[]> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.warn("OPENAI_API_KEY not set — skipping content extraction");
      return [];
    }

    const allItems: ExtractedItem[] = [];

    // Process pages in batches of 3 to avoid token limits
    const batches = this.batchPages(pages, 3);

    for (const batch of batches) {
      try {
        const items = await this.extractBatch(apiKey, batch);
        allItems.push(...items);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Extraction batch failed: ${msg}`);
      }
    }

    return this.deduplicateItems(allItems);
  }

  private async extractBatch(
    apiKey: string,
    pages: CrawledPage[],
  ): Promise<ExtractedItem[]> {
    const pagesText = pages
      .map(
        (p, i) =>
          `--- PAGE ${i + 1}: ${p.url} ---\nTitle: ${p.title}\n${p.description ? `Description: ${p.description}\n` : ""}\n${p.text}`,
      )
      .join("\n\n");

    const res = await fetchWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Extract business knowledge from these ${pages.length} page(s):\n\n${pagesText}`,
            },
          ],
        }),
      },
      { timeoutMs: 30_000, attempts: 2 },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = body.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      this.logger.warn(`Empty GPT response for pages: ${pages.map((p) => p.url).join(", ")}`);
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      // GPT with json_object mode always returns an object, never a bare array.
      // The model may wrap the array under any key (items, results, extracted_items, etc.)
      // so we find the first array property dynamically.
      let items: unknown[];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
        items = (firstArray as unknown[]) ?? [];
        if (!firstArray) {
          this.logger.warn(
            `GPT response has no array property. Keys: ${Object.keys(parsed).join(", ")}. Raw: ${raw.slice(0, 300)}`,
          );
        }
      } else {
        items = [];
      }

      const mapped = items
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          title: String(item.title ?? "Untitled").slice(0, 200),
          category: this.resolveCategory(String(item.category ?? "general")),
          content: String(item.content ?? "").slice(0, 15_000),
          confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0.5))),
          sourceUrl: pages[0].url,
        }))
        .filter((item) => item.content.length >= 20 && item.confidence >= 0.3);

      this.logger.log(
        `Extracted ${mapped.length} items from ${pages.length} page(s) (raw array had ${items.length} entries)`,
      );
      return mapped;
    } catch (err) {
      this.logger.warn(
        `Failed to parse extraction JSON: ${err instanceof Error ? err.message : err}. Raw: ${raw.slice(0, 300)}`,
      );
      return [];
    }
  }

  private resolveCategory(input: string): KnowledgeCategory {
    const lower = input.toLowerCase().trim();
    if (KNOWLEDGE_CATEGORIES.includes(lower as KnowledgeCategory)) {
      return lower as KnowledgeCategory;
    }
    // Map common variations
    if (lower.includes("price") || lower.includes("cost")) return "pricing";
    if (lower.includes("faq") || lower.includes("question")) return "faq";
    if (lower.includes("product") || lower.includes("catalog")) return "product";
    if (lower.includes("policy") || lower.includes("terms") || lower.includes("refund"))
      return "policy";
    if (lower.includes("about") || lower.includes("company") || lower.includes("team"))
      return "about";
    if (lower.includes("service")) return "services";
    if (lower.includes("contact") || lower.includes("location") || lower.includes("hours"))
      return "contact";
    return "general";
  }

  private deduplicateItems(items: ExtractedItem[]): ExtractedItem[] {
    const seen = new Map<string, ExtractedItem>();

    for (const item of items) {
      const key = `${item.category}::${item.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
      const existing = seen.get(key);

      if (!existing || item.confidence > existing.confidence) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
  }

  private batchPages(pages: CrawledPage[], batchSize: number): CrawledPage[][] {
    const batches: CrawledPage[][] = [];
    for (let i = 0; i < pages.length; i += batchSize) {
      batches.push(pages.slice(i, i + batchSize));
    }
    return batches;
  }
}
