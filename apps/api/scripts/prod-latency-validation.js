#!/usr/bin/env node
/**
 * Production latency validation — baseline query + post-deploy webhook simulation.
 *
 * Usage:
 *   pnpm exec dotenv -e .env -- node apps/api/scripts/prod-latency-validation.js baseline
 *   pnpm exec dotenv -e .env -- node apps/api/scripts/prod-latency-validation.js measure
 */
const { createHmac } = require("crypto");
const { PrismaClient } = require("@prisma/client");

const API_URL = (process.env.API_URL || "https://api.growvisi.in").replace(/\/$/, "");
const CONVERSATION_ID = process.env.LATENCY_TEST_CONVERSATION_ID || "cmrq48t840002lb04e1yd6532";

function sanitizeEnv(value) {
  if (value == null) return undefined;
  let v = String(value).replace(/\r/g, "").trim();
  while (/\\r\\n$|\\n$|\\r$/.test(v)) {
    v = v.replace(/\\r\\n$|\\n$|\\r$/, "").trim();
  }
  return v || undefined;
}

const prisma = new PrismaClient();

async function baseline() {
  const stats = await prisma.$queryRaw`
    SELECT type, status,
      COUNT(*)::int as n,
      ROUND(AVG("latencyMs")::numeric, 0) as avg_ms,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "latencyMs")::numeric, 0) as p50_ms,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "latencyMs")::numeric, 0) as p95_ms
    FROM ai_runs
    WHERE "latencyMs" IS NOT NULL AND status = 'COMPLETED'
      AND "createdAt" > NOW() - INTERVAL '30 days'
    GROUP BY type, status
    ORDER BY type
  `;

  const e2e = await prisma.$queryRaw`
    WITH pairs AS (
      SELECT
        i."createdAt" AS inbound_at,
        o."createdAt" AS ai_out_at,
        LEFT(i.content, 30) as msg,
        EXTRACT(EPOCH FROM (o."createdAt" - i."createdAt")) * 1000 AS e2e_ms
      FROM messages i
      JOIN LATERAL (
        SELECT m."createdAt"
        FROM messages m
        WHERE m."conversationId" = i."conversationId"
          AND m.direction = 'OUTBOUND'
          AND m."sentByAi" = true
          AND m."createdAt" > i."createdAt"
        ORDER BY m."createdAt" ASC
        LIMIT 1
      ) o ON true
      WHERE i.direction = 'INBOUND'
        AND i."createdAt" > NOW() - INTERVAL '30 days'
    )
    SELECT
      COUNT(*)::int AS n,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e2e_ms)::numeric, 0) AS p50_e2e_ms,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY e2e_ms)::numeric, 0) AS p95_e2e_ms,
      ROUND(AVG(e2e_ms)::numeric, 0) AS avg_e2e_ms
    FROM pairs
    WHERE e2e_ms <= 120000
  `;

  console.log(JSON.stringify({ baseline_at: new Date().toISOString(), ai_runs: stats, e2e_auto_reply: e2e }, null, 2));
}

async function measure() {
  const conv = await prisma.conversation.findFirst({
    where: { id: CONVERSATION_ID },
    include: {
      whatsappAccount: true,
      lead: true,
    },
  });
  if (!conv?.whatsappAccount) {
    throw new Error(`Conversation ${CONVERSATION_ID} or WhatsApp account not found`);
  }

  const secret =
    sanitizeEnv(process.env.WHATSAPP_APP_SECRET) ||
    sanitizeEnv(process.env.META_APP_SECRET);
  if (!secret) throw new Error("WHATSAPP_APP_SECRET or META_APP_SECRET required");

  const phoneNumberId = conv.whatsappAccount.phoneNumberId;
  const wabaId = conv.whatsappAccount.wabaId || "test_waba";
  const contactPhone = conv.contactPhone.replace(/\D/g, "");
  const waMessageId = `wamid.latency_test_${Date.now()}`;
  const testText = `Hi latency ${Date.now() % 10000}`;

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: wabaId,
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: conv.whatsappAccount.displayPhone || "",
                phone_number_id: phoneNumberId,
              },
              contacts: [{ profile: { name: conv.contactName || "Test" }, wa_id: contactPhone }],
              messages: [
                {
                  from: contactPhone,
                  id: waMessageId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: testText },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(payload);
  // Vercel may verify against re-stringified parsed body when rawBody is absent.
  const verificationBody = JSON.stringify(JSON.parse(body));
  const signature = `sha256=${createHmac("sha256", secret).update(verificationBody).digest("hex")}`;

  const started = Date.now();
  console.log(`Sending test inbound "${testText}" at ${new Date().toISOString()}`);

  const res = await fetch(`${API_URL}/api/v1/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature,
    },
    body,
  });

  const ackMs = Date.now() - started;
  const ackBody = await res.text();
  console.log(`Webhook ack: ${res.status} in ${ackMs}ms — ${ackBody.slice(0, 120)}`);

  if (!res.ok) throw new Error(`Webhook failed: ${res.status}`);

  // Poll for AI outbound (up to 90s)
  const deadline = Date.now() + 90_000;
  let inboundMsg = null;
  let outboundMsg = null;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));

    inboundMsg = await prisma.message.findFirst({
      where: { conversationId: CONVERSATION_ID, waMessageId },
      select: { id: true, createdAt: true, content: true },
    });

    if (inboundMsg) {
      outboundMsg = await prisma.message.findFirst({
        where: {
          conversationId: CONVERSATION_ID,
          direction: "OUTBOUND",
          sentByAi: true,
          createdAt: { gt: inboundMsg.createdAt },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, createdAt: true, content: true, sentByAi: true },
      });
    }

    if (inboundMsg && outboundMsg) break;
  }

  const classifyRun = inboundMsg
    ? await prisma.aiRun.findFirst({
        where: {
          conversationId: CONVERSATION_ID,
          type: "classify",
          createdAt: { gte: new Date(started) },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          latencyMs: true,
          input: true,
          output: true,
          createdAt: true,
          completedAt: true,
        },
      })
    : null;

  const composeRun = inboundMsg
    ? await prisma.aiRun.findFirst({
        where: {
          conversationId: CONVERSATION_ID,
          type: "suggest_reply",
          createdAt: { gte: new Date(started) },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          latencyMs: true,
          provider: true,
          model: true,
          input: true,
          output: true,
          createdAt: true,
          completedAt: true,
        },
      })
    : null;

  const e2eMs =
    inboundMsg && outboundMsg
      ? outboundMsg.createdAt.getTime() - inboundMsg.createdAt.getTime()
      : null;

  const result = {
    measured_at: new Date().toISOString(),
    test_message: testText,
    webhook_ack_ms: ackMs,
    inbound_stored: inboundMsg?.createdAt?.toISOString() ?? null,
    ai_outbound_at: outboundMsg?.createdAt?.toISOString() ?? null,
    ai_outbound_preview: outboundMsg?.content?.slice(0, 80) ?? null,
    customer_e2e_ms: e2eMs,
    classify_run: classifyRun,
    compose_run: composeRun,
    classify_output_path:
      classifyRun?.output?.executionPath ?? classifyRun?.output?.fastPath ?? null,
    compose_fast_path: composeRun?.output?.fastPath ?? null,
    spans: classifyRun?.output?.spans ?? composeRun?.input?.spans ?? null,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

const cmd = process.argv[2] || "baseline";
(async () => {
  try {
    if (cmd === "baseline") await baseline();
    else if (cmd === "measure") await measure();
    else throw new Error(`Unknown command: ${cmd}`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
