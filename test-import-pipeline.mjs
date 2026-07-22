/**
 * End-to-end test: crawl a website and extract knowledge items.
 * Usage: node test-import-pipeline.mjs <url>
 */
import { readFileSync } from "fs";

// Load .env.local manually
try {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* no env file */ }

const TEST_URL = process.argv[2] || "https://growvisi.com";

// ── Phase 1: Crawl ─────────────────────────────────────────────────────────

async function crawlPage(url) {
  console.log(`  Fetching: ${url}`);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrowvisiBot/1.0; +https://growvisi.com/bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

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

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;

    console.log(`    ✓ Extracted ${text.length} chars of text`);
    console.log(`    ✓ Title: "${title.slice(0, 80)}"`);
    console.log(`    ✓ Text preview: "${text.slice(0, 250)}..."`);

    return { url, title, text };
  } catch (err) {
    console.log(`    ✗ Error: ${err.message}`);
    return null;
  }
}

// ── Phase 2: Extract via GPT ────────────────────────────────────────────────

async function extractKnowledge(pages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("✗ OPENAI_API_KEY not set!");
    process.exit(1);
  }
  console.log(`  Using API key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  const CATEGORIES = ["general", "pricing", "faq", "product", "policy", "about", "services", "contact"];

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
    .map((p, i) => `--- PAGE ${i + 1}: ${p.url} ---\nTitle: ${p.title}\n\n${p.text}`)
    .join("\n\n");

  console.log("\n── Phase 2: GPT Extraction ──");
  console.log(`Sending ${pages.length} page(s) to GPT-4o-mini (${pagesText.length} chars)...`);

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
    console.error(`✗ OpenAI API error ${res.status}: ${err.slice(0, 500)}`);
    process.exit(1);
  }

  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    console.error("✗ Empty GPT response!");
    console.error("Full body:", JSON.stringify(body, null, 2).slice(0, 500));
    process.exit(1);
  }

  console.log(`\n── Raw GPT Response (${raw.length} chars) ──`);
  console.log(raw.slice(0, 600));
  if (raw.length > 600) console.log(`... (${raw.length} chars total)`);

  const parsed = JSON.parse(raw);
  console.log(`\n── Parsed Response ──`);
  console.log(`Type: ${typeof parsed}, Is Array: ${Array.isArray(parsed)}`);
  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    console.log(`Keys: ${Object.keys(parsed).join(", ")}`);
    for (const [k, v] of Object.entries(parsed)) {
      console.log(`  "${k}": ${Array.isArray(v) ? `Array(${v.length})` : typeof v}`);
    }
  }

  // FIXED parsing logic — find first array property
  let items;
  if (Array.isArray(parsed)) {
    items = parsed;
    console.log(`→ Used direct array (${items.length} items)`);
  } else if (typeof parsed === "object" && parsed !== null) {
    const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
    items = firstArray ?? [];
    if (firstArray) {
      const key = Object.entries(parsed).find(([, v]) => v === firstArray)?.[0];
      console.log(`→ Found array under key "${key}" (${items.length} items)`);
    } else {
      console.log(`✗ No array property found in response!`);
    }
  } else {
    items = [];
  }

  console.log(`\n── Extracted Items (${items.length}) ──`);
  for (const item of items) {
    console.log(`\n  [${item.category}] ${item.title} (confidence: ${item.confidence})`);
    console.log(`  ${String(item.content ?? "").slice(0, 200)}`);
  }

  return items;
}

// ── Main ────────────────────────────────────────────────────────────────────

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

console.log(`\n═══ RESULT ═══`);
console.log(`Pages crawled: 1`);
console.log(`Items extracted: ${items.length}`);
console.log(
  items.length > 0
    ? "✓ Pipeline works end-to-end!"
    : "✗ Pipeline produced 0 items — extraction failed!",
);
