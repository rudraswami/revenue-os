/**
 * Test the full pipeline logic with a REAL crawl + MOCKED GPT response.
 * Verifies: crawl works, text extraction works, JSON parsing logic works.
 */
import { readFileSync } from "fs";

const TEST_URL = process.argv[2] || "https://freshworks.com";

// ── Phase 1: Real Crawl ────────────────────────────────────────────────────

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

    console.log(`    Status: ${res.status}`);
    if (!res.ok) return null;

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
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ").replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;

    console.log(`    ✓ Text: ${text.length} chars`);
    console.log(`    ✓ Title: "${title.slice(0, 80)}"`);
    console.log(`    ✓ Preview: "${text.slice(0, 300)}..."`);

    return { url, title, text };
  } catch (err) {
    console.log(`    ✗ ${err.message}`);
    return null;
  }
}

// ── Phase 2: Test JSON Parsing Logic ────────────────────────────────────────

function testJsonParsing() {
  console.log("\n── Testing JSON Parsing Logic ──");

  const testCases = [
    {
      name: 'GPT wraps in "items" key',
      raw: JSON.stringify({
        items: [
          { title: "Pricing", category: "pricing", content: "Basic plan ₹999/mo", confidence: 0.9 },
          { title: "Contact", category: "contact", content: "Phone: +91 80 1234", confidence: 0.85 },
        ],
      }),
    },
    {
      name: 'GPT wraps in "results" key',
      raw: JSON.stringify({
        results: [
          { title: "About", category: "about", content: "We are a tech company", confidence: 0.8 },
        ],
      }),
    },
    {
      name: 'GPT wraps in "extracted_items" key',
      raw: JSON.stringify({
        extracted_items: [
          { title: "FAQ", category: "faq", content: "How to reset password?", confidence: 0.7 },
        ],
      }),
    },
    {
      name: 'GPT wraps in "knowledge" key',
      raw: JSON.stringify({
        knowledge: [
          { title: "Services", category: "services", content: "Web dev and mobile", confidence: 0.75 },
        ],
      }),
    },
    {
      name: 'GPT wraps in "data" key with extra metadata',
      raw: JSON.stringify({
        summary: "Extracted from company website",
        data: [
          { title: "Hours", category: "contact", content: "Mon-Fri 9-6", confidence: 0.9 },
        ],
        count: 1,
      }),
    },
    {
      name: "GPT returns bare array (unlikely with json_object mode)",
      raw: JSON.stringify([
        { title: "Policy", category: "policy", content: "30-day return", confidence: 0.8 },
      ]),
    },
    {
      name: "GPT returns object with no arrays (edge case)",
      raw: JSON.stringify({ message: "No useful content found" }),
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const parsed = JSON.parse(tc.raw);

    let items;
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
      items = firstArray ?? [];
    } else {
      items = [];
    }

    const expected = tc.name.includes("no arrays") ? 0 : tc.name.includes("bare array") ? 1 : undefined;
    const ok = expected !== undefined ? items.length === expected : items.length > 0;

    console.log(`  ${ok ? "✓" : "✗"} ${tc.name} → ${items.length} items`);
    if (ok) passed++;
    else console.log(`    FAIL: expected items but got ${items.length}`);
  }

  console.log(`\n  ${passed}/${testCases.length} parsing tests passed`);
  return passed === testCases.length;
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log(`═══ Pipeline End-to-End Test ═══\n`);

// Test 1: JSON parsing
const parsingOk = testJsonParsing();

// Test 2: Real crawl
console.log("\n── Testing Real Crawl ──");
const sites = [
  TEST_URL,
  "https://www.zomato.com",
  "https://razorpay.com",
];

let crawlSuccess = 0;
for (const site of sites) {
  console.log(`\nCrawling ${site}:`);
  const page = await crawlPage(site);
  if (page && page.text.length >= 50) {
    console.log(`    ✓ PASS — ${page.text.length} chars extracted`);
    crawlSuccess++;
  } else {
    console.log(`    ✗ FAIL — ${page ? `only ${page.text.length} chars` : "could not fetch"}`);
  }
}

console.log(`\n═══ RESULTS ═══`);
console.log(`JSON Parsing: ${parsingOk ? "✓ ALL PASSED" : "✗ SOME FAILED"}`);
console.log(`Crawl: ${crawlSuccess}/${sites.length} sites crawled successfully`);
console.log(
  parsingOk && crawlSuccess >= 2
    ? "\n✓ Pipeline is working correctly!"
    : "\n✗ Issues detected — see above",
);
