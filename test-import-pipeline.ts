/**
 * End-to-end test: crawl a website and extract knowledge items.
 * Usage: npx tsx test-import-pipeline.ts <url>
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TEST_URL = process.argv[2] || "https://growvisi.com";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Phase 1: Crawl ─────────────────────────────────────────────────────────

interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

async function crawlPage(url: string): Promise<CrawledPage | null> {
  console.log(`  Fetching: ${url}`);
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GrowvisiBot/1.0; +https://growvisi.com/bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.log(`    ✗ HTTP ${res.status}`);
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      console.log(`    ✗ Not HTML: ${contentType}`);
      return null;
    }

    const html = await res.text();
    console.log(`    ✓ Got ${html.length} chars of HTML`);

    // Simple text extraction (cheerio not available in this script)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;

    console.log(`    ✓ Extracted ${text.length} chars of text`);
    console.log(`    ✓ Title: "${title.slice(0, 80)}"`);
    console.log(`    ✓ Text preview: "${text.slice(0, 200)}..."`);

    return { url, title, text };
  } catch (err) {
    console.log(
      `    ✗ Error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

// ── Phase 2: Extract via GPT ────────────────────────────────────────────────

async function extractKnowledge(pages: CrawledPage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("✗ OPENAI_API_KEY not set!");
    process.exit(1);
  }

  const CATEGORIES = [
    "general",
    "pricing",
    "faq",
    "product",
    "policy",
    "about",
    "services",
    "contact",
  ];

  const systemPrompt = `You are a business knowledge extractor for an AI sales assistant.

Given webpage content, extract ALL meaningful business knowledge that would help an AI answer customer questions over WhatsApp.

Extract into structured items, each with:
- title: Short descriptive title
- category: One of: ${CATEGORIES.join(", ")}
- content: The actual knowledge formatted as clear text with specific details
- confidence: 0.0-1.0 how confident you are this is useful business knowledge

RULES:
- Extract SPECIFIC facts: prices, hours, addresses, phone numbers, policies, product details
- Combine related items
- Format content as clear, concise text an AI can use to answer questions
- Skip: cookie notices, generic marketing copy, navigation text

Respond with a JSON object containing an "items" array.`;

  const pagesText = pages
    .map(
      (p, i) => `--- PAGE ${i + 1}: ${p.url} ---\nTitle: ${p.title}\n\n${p.text}`,
    )
    .join("\n\n");

  console.log("\n── Phase 2: GPT Extraction ──");
  console.log(`Sending ${pages.length} page(s) to GPT-4o-mini...`);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract business knowledge from these ${pages.length} page(s):\n\n${pagesText}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`✗ OpenAI API error ${res.status}: ${err}`);
    process.exit(1);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = body.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    console.error("✗ Empty GPT response!");
    process.exit(1);
  }

  console.log(`\n── Raw GPT Response ──`);
  console.log(raw.slice(0, 500));
  console.log(raw.length > 500 ? `... (${raw.length} chars total)` : "");

  // Parse — test the FIXED parsing logic
  const parsed = JSON.parse(raw);
  console.log(`\n── Parsed Response ──`);
  console.log(`Type: ${typeof parsed}`);
  console.log(`Is Array: ${Array.isArray(parsed)}`);
  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    console.log(`Keys: ${Object.keys(parsed).join(", ")}`);
  }

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
    console.log(`→ Used direct array (${items.length} items)`);
  } else if (typeof parsed === "object" && parsed !== null) {
    const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
    items = (firstArray as unknown[]) ?? [];
    if (firstArray) {
      const key = Object.entries(parsed).find(([, v]) => v === firstArray)?.[0];
      console.log(`→ Found array under key "${key}" (${items.length} items)`);
    } else {
      console.log(`✗ No array property found in response!`);
      items = [];
    }
  } else {
    items = [];
  }

  console.log(`\n── Extracted Items (${items.length}) ──`);
  for (const item of items as Array<Record<string, unknown>>) {
    console.log(
      `\n  [${item.category}] ${item.title} (confidence: ${item.confidence})`,
    );
    console.log(`  ${String(item.content ?? "").slice(0, 150)}...`);
  }

  return items;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n═══ Website Import Pipeline Test ═══`);
  console.log(`URL: ${TEST_URL}\n`);

  console.log("── Phase 1: Crawl ──");
  const page = await crawlPage(TEST_URL);
  if (!page) {
    console.error("✗ Could not crawl the page!");
    process.exit(1);
  }

  if (page.text.length < 50) {
    console.error(`✗ Text too short (${page.text.length} chars) — would be skipped!`);
    process.exit(1);
  }

  const items = await extractKnowledge([page]);

  console.log(`\n═══ Result ═══`);
  console.log(`Pages crawled: 1`);
  console.log(`Items extracted: ${items.length}`);
  console.log(
    items.length > 0
      ? "✓ Pipeline works end-to-end!"
      : "✗ Pipeline produced 0 items — extraction failed!",
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
