/**
 * Test the enhanced crawl extraction for SSR and SPA sites.
 * Usage: node test-crawl.mjs [url1] [url2] ...
 */

const TEST_URLS = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ["https://www.thewavly.com", "https://www.growvisi.in", "https://razorpay.com", "https://freshworks.com"];

async function crawlAndExtract(url) {
  console.log(`\n═══ ${url} ═══`);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrowvisiBot/1.0; +https://growvisi.com/bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.log(`  ✗ HTTP ${res.status}`);
      return false;
    }

    const html = await res.text();
    console.log(`  HTML: ${html.length} chars`);

    // ── Standard extraction (strip scripts, extract from semantic elements) ──
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "");

    // Extract from semantic elements
    const semanticMatches = stripped.match(/<(?:h[1-6]|p|li|td|th|blockquote|dd|address)[^>]*>([\s\S]*?)<\/(?:h[1-6]|p|li|td|th|blockquote|dd|address)>/gi) || [];
    const semanticText = semanticMatches
      .map(m => m.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(t => t.length > 3)
      .join("\n\n")
      .slice(0, 15000);

    // Raw text fallback
    const rawText = stripped.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    console.log(`  Standard extraction: ${semanticText.length} chars`);
    console.log(`  Raw text fallback: ${rawText.length} chars`);

    // ── SPA extraction ──
    const spaParts = [];

    // Meta tags
    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/)?.[1];
    const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)?.[1];
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/)?.[1];
    if (ogTitle) spaParts.push(`# ${ogTitle}`);
    if (metaDesc) spaParts.push(metaDesc);
    if (ogDesc && ogDesc !== metaDesc) spaParts.push(ogDesc);

    // JSON-LD
    const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (ldMatches) {
      for (const m of ldMatches) {
        try {
          const json = JSON.parse(m.replace(/<\/?script[^>]*>/g, ""));
          const fields = ["name", "description", "headline", "articleBody", "telephone", "email", "openingHours", "priceRange", "streetAddress", "addressLocality"];
          for (const f of fields) {
            if (json[f] && typeof json[f] === "string") spaParts.push(`${f}: ${json[f]}`);
          }
        } catch {}
      }
    }

    // __NEXT_DATA__ (Pages Router)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      const strings = nextDataMatch[1].match(/"([^"]{15,500})"/g);
      if (strings) {
        const vals = strings
          .map(s => s.slice(1, -1))
          .filter(v => !/^(https?:|\/|#|data:|\\u)/.test(v))
          .filter(v => !/[{}<>]|function\s|=>|\.js$/.test(v))
          .filter(v => v.split(/\s+/).length >= 3);
        if (vals.length > 0) spaParts.push(vals.join("\n"));
      }
    }

    // RSC payload (App Router)
    const rscChunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    if (rscChunks.length > 0) {
      const rscTexts = new Set();
      for (const [, raw] of rscChunks) {
        const decoded = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        const matches = decoded.match(/[A-Z\u0900-\u097F₹][a-zA-Z\u0900-\u097F\s,.\-—₹:;!?'&/()]{12,}/g);
        if (matches) {
          for (const m of matches) {
            const t = m.trim();
            if (/^(Element|Function|Object|Array|import|export|const|let|var|class)\b/.test(t)) continue;
            if (/classList|querySelector|addEventListener|className/.test(t)) continue;
            rscTexts.add(t);
          }
        }
      }
      if (rscTexts.size > 0) spaParts.push([...rscTexts].join("\n"));
    }

    const spaText = spaParts.join("\n\n").slice(0, 15000);
    console.log(`  SPA extraction: ${spaText.length} chars`);

    // Use best result
    const bestText = semanticText.length >= 200 ? semanticText : (spaText.length > semanticText.length ? spaText : (rawText.length > 100 ? rawText : spaText));
    console.log(`  → Best: ${bestText.length} chars (${semanticText.length >= 200 ? "standard" : spaText.length > semanticText.length ? "SPA" : "raw/SPA"})`);

    const isSPA = semanticText.length < 200 && spaText.length > semanticText.length;
    if (isSPA) console.log("  → Site is SPA — used SPA extraction");

    // Show preview
    console.log(`  Preview: "${bestText.slice(0, 300).replace(/\n/g, " ")}..."`);
    console.log(`  ✓ Would pass threshold (${bestText.length} >= 30): ${bestText.length >= 30 ? "YES" : "NO"}`);

    return bestText.length >= 30;
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    return false;
  }
}

console.log("═══ Enhanced Crawl Test ═══\n");

let passed = 0;
for (const url of TEST_URLS) {
  const ok = await crawlAndExtract(url);
  if (ok) passed++;
}

console.log(`\n═══ RESULTS: ${passed}/${TEST_URLS.length} sites extracted successfully ═══`);
console.log(passed === TEST_URLS.length ? "✓ All sites work!" : "✗ Some sites failed — see above");
