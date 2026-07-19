/**
 * Measure live pipeline latency by running AiClassifyService.process() against production DB.
 * Exercises the same code path deployed on Vercel (inline workers, no webhook wrapper).
 *
 * Usage:
 *   node apps/api/scripts/measure-pipeline-prod.mjs [greeting|thanks|pricing|all]
 */
import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, "../.env.production.local"));
loadEnvFile(join(__dirname, "../../../.env"));

const require = createRequire(join(__dirname, "../dist/main.js"));
const { PrismaClient } = require("@prisma/client");

const CONVERSATION_ID = process.env.LATENCY_TEST_CONVERSATION_ID || "cmrq48t840002lb04e1yd6532";
const SCENARIOS = {
  greeting: "Hi",
  thanks: "Thanks!",
  pricing: "What are your pricing plans?",
};

function ensureBootstrapEnv() {
  process.env.USE_INLINE_WORKERS = "1";
  process.env.VERCEL = "1";
  const missing = ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "REDIS_URL", "OPENAI_API_KEY"].filter(
    (k) => !process.env[k]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing env for measurement: ${missing.join(", ")}. Run: cd apps/api && vercel env pull .env.production.local --environment=production`,
    );
  }
}

const prisma = new PrismaClient();

async function runScenario(conv, testText) {
  const waMessageId = `wamid.pipeline_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const inbound = await prisma.message.create({
    data: {
      organizationId: conv.organizationId,
      conversationId: conv.id,
      waMessageId,
      direction: "INBOUND",
      type: "TEXT",
      status: "DELIVERED",
      content: testText,
      sentByAi: false,
    },
  });

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastInboundAt: new Date(), lastMessageAt: new Date() },
  });

  const pipelineStart = Date.now();
  console.log(`\nInbound ${inbound.id} "${testText}" at ${new Date().toISOString()}`);

  const { NestFactory } = await import("@nestjs/core");
  const { AppModule } = await import("../dist/app.module.js");
  const { AiClassifyService } = await import("../dist/modules/ai/ai-classify.service.js");

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    const classify = app.get(AiClassifyService);
    const processStart = Date.now();
    await classify.process({
      organizationId: conv.organizationId,
      conversationId: conv.id,
      messageId: inbound.id,
      leadId: conv.lead.id,
    });
    const processMs = Date.now() - processStart;

    const outbound = await prisma.message.findFirst({
      where: {
        conversationId: conv.id,
        direction: "OUTBOUND",
        sentByAi: true,
        createdAt: { gt: inbound.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });

    const classifyRun = await prisma.aiRun.findFirst({
      where: {
        conversationId: conv.id,
        createdAt: { gte: new Date(pipelineStart) },
        type: "classify",
      },
      orderBy: { createdAt: "desc" },
    });

    const composeRun = await prisma.aiRun.findFirst({
      where: {
        conversationId: conv.id,
        createdAt: { gte: new Date(pipelineStart) },
        type: "suggest_reply",
      },
      orderBy: { createdAt: "desc" },
    });

    const e2eMs = outbound
      ? outbound.createdAt.getTime() - inbound.createdAt.getTime()
      : null;

    return {
      measured_at: new Date().toISOString(),
      test_message: testText,
      process_wall_ms: processMs,
      customer_e2e_ms: e2eMs,
      outbound_preview: outbound?.content?.slice(0, 100) ?? null,
      execution_path: classifyRun?.output?.executionPath ?? classifyRun?.output?.fastPath ?? null,
      spans: classifyRun?.output?.spans ?? composeRun?.input?.spans ?? null,
      classify_run: classifyRun
        ? {
            latencyMs: classifyRun.latencyMs,
            output: classifyRun.output,
          }
        : null,
      compose_run: composeRun
        ? {
            latencyMs: composeRun.latencyMs,
            provider: composeRun.provider,
            model: composeRun.model,
            output: composeRun.output,
          }
        : null,
    };
  } finally {
    await app.close();
  }
}

async function main() {
  ensureBootstrapEnv();

  const conv = await prisma.conversation.findFirst({
    where: { id: CONVERSATION_ID },
    include: { lead: true, whatsappAccount: true },
  });
  if (!conv?.lead) throw new Error("Test conversation not found");

  const scenarioArg = process.argv[2] || "all";
  const texts =
    scenarioArg === "all"
      ? Object.values(SCENARIOS)
      : [SCENARIOS[scenarioArg] ?? scenarioArg];

  const results = [];
  for (const testText of texts) {
    results.push(await runScenario(conv, testText));
  }

  console.log(JSON.stringify({ conversation_id: CONVERSATION_ID, results }, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
