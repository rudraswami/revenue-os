/**
 * Diagnose AI reply root cause for a workspace — prompts vs DB content.
 *
 * Usage:
 *   DIRECT_URL=... pnpm exec tsx scripts/diagnose-ai-workspace.ts nayeez@gmail.com
 */
import { PrismaClient } from "@prisma/client";
import {
  resolveIndustryComposePersona,
  formatIndustryComposePersonaBlock,
  normalizeBusinessEmployeeProfile,
} from "@growvisi/shared";

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm exec tsx scripts/diagnose-ai-workspace.ts <email>");
  process.exit(1);
}

const HEALTH = /doctor|patient|clinic|hospital|medical|health concern|OPD|diagnos|receptionist/i;
const PRICING = /₹|rs\.?\s*\d|\/mo|per month|pricing|plan.*₹/i;

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true } } },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const org = user.memberships[0]?.organization;
  if (!org) {
    console.error(`No organization for ${email}`);
    process.exit(1);
  }

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const intelligence = (settings.intelligence ?? {}) as Record<string, unknown>;
  const industryId = intelligence.industryId as string | undefined;
  const customIndustryLabel = intelligence.customIndustryLabel as string | undefined;
  const businessProfile = normalizeBusinessEmployeeProfile(
    intelligence.businessProfile ?? settings.businessProfile,
    org.name,
  );

  const persona = resolveIndustryComposePersona({
    industryId,
    customIndustryLabel,
    businessName: org.name,
    profile: businessProfile,
  });
  const personaBlock = formatIndustryComposePersonaBlock(persona);

  console.log("\n=== WORKSPACE ===");
  console.log(JSON.stringify({ orgId: org.id, orgName: org.name, industryId, customIndustryLabel }, null, 2));

  console.log("\n=== COMPOSE PERSONA (injected into every reply) ===");
  console.log(personaBlock);
  console.log(`\nPersona contains health/clinic words: ${HEALTH.test(personaBlock)}`);

  console.log("\n=== PROFILE ESCALATION / ACKNOWLEDGMENTS ===");
  console.log(JSON.stringify({
    escalation: businessProfile.escalation,
    composePersonaOverride: businessProfile.composePersona,
    knowledge_gap_ack: businessProfile.acknowledgments.knowledge_gap,
    quickAnswerCount: businessProfile.quickAnswers.length,
  }, null, 2));

  const docs = await prisma.knowledgeDocument.findMany({
    where: { organizationId: org.id },
    select: { title: true, category: true, sourceType: true, status: true, rawContent: true },
    orderBy: { updatedAt: "desc" },
  });

  const chunkCount = await prisma.knowledgeChunk.count({
    where: { document: { organizationId: org.id } },
  });

  console.log("\n=== KNOWLEDGE DOCUMENTS ===");
  console.log(`docs=${docs.length} chunks=${chunkCount}`);
  for (const d of docs) {
    const snippet = (d.rawContent ?? "").slice(0, 120).replace(/\n/g, " ");
    const flags = [
      HEALTH.test(`${d.title} ${d.rawContent ?? ""}`) ? "HEALTH" : null,
      PRICING.test(`${d.title} ${d.rawContent ?? ""}`) ? "PRICING" : null,
    ].filter(Boolean);
    console.log(`- [${d.status}] ${d.category} | ${d.sourceType} | ${d.title}${flags.length ? ` <<${flags.join(",")}>>` : ""}`);
    if (flags.length) console.log(`    snippet: ${snippet}...`);
  }

  const aiRuns = await prisma.aiRun.findMany({
    where: { organizationId: org.id, type: { in: ["suggest_reply", "classify"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log("\n=== RECENT AI RUNS (suggest_reply + classify) ===");
  for (const r of aiRuns) {
    const out = r.output as Record<string, unknown> | null;
    const inp = r.input as Record<string, unknown> | null;
    const suggestion = typeof out?.suggestion === "string" ? out.suggestion : "";
    const sources = Array.isArray(out?.sources)
      ? (out.sources as Array<{ title?: string }>).map((s) => s.title).filter(Boolean)
      : [];
    const healthInSuggestion = HEALTH.test(suggestion);
    const pricingInSuggestion = PRICING.test(suggestion);
    const deferral = /confirm|don't have|do not have|not enough|get back to you|check with/i.test(suggestion);

    if (!healthInSuggestion && !pricingInSuggestion && !deferral && r.type !== "suggest_reply") continue;

    console.log(`\n--- ${r.type} @ ${r.createdAt.toISOString()} ---`);
    console.log(`intent: ${inp?.intent ?? out?.intent ?? "—"} | intentKind: ${inp?.intentKind ?? "—"} | hits: ${inp?.hitCount ?? "—"}`);
    if (sources.length) console.log(`sources: ${sources.join(" | ")}`);
    if (suggestion) {
      console.log(`reply: ${suggestion.slice(0, 400)}${suggestion.length > 400 ? "…" : ""}`);
      console.log(`flags: health=${healthInSuggestion} pricing=${pricingInSuggestion} deferral=${deferral}`);
    }
    if (r.type === "classify" && out?.summary) {
      console.log(`summary: ${String(out.summary).slice(0, 200)}`);
    }
  }

  console.log("\n=== RUNS WITH HEALTH LANGUAGE IN REPLY ===");
  const allSuggest = await prisma.aiRun.findMany({
    where: { organizationId: org.id, type: "suggest_reply" },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  let healthRunCount = 0;
  for (const r of allSuggest) {
    const out = r.output as Record<string, unknown> | null;
    const suggestion = typeof out?.suggestion === "string" ? out.suggestion : "";
    if (!HEALTH.test(suggestion)) continue;
    healthRunCount++;
    const sources = Array.isArray(out?.sources)
      ? (out.sources as Array<{ title?: string }>).map((s) => s.title).filter(Boolean)
      : [];
    console.log(`\n--- ${r.createdAt.toISOString()} ---`);
    console.log(`sources: ${sources.join(" | ")}`);
    console.log(`reply: ${suggestion.slice(0, 500)}`);
  }
  if (!healthRunCount) console.log("(none in last 80 suggest_reply runs)");

  console.log("\n=== industry_handbook DOCUMENTS (full) ===");
  const handbookDocs = docs.filter((d) => d.sourceType === "industry_handbook");
  for (const d of handbookDocs) {
    console.log(`\n[${d.status}] ${d.title}`);
    console.log((d.rawContent ?? "").slice(0, 350));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
