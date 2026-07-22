import { readFileSync } from "node:fs";
import { PrismaClient } from "../packages/database/node_modules/@prisma/client/index.js";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

function meta(payload) {
  const out = [];
  for (const e of payload?.entry ?? [])
    for (const ch of e.changes ?? []) {
      if (ch.field !== "messages") continue;
      out.push({
        wabaId: e.id,
        phoneNumberId: ch.value?.metadata?.phone_number_id,
        display: ch.value?.metadata?.display_phone_number,
        hasMsg: (ch.value?.messages ?? []).length,
      });
    }
  return out;
}

async function main() {
  console.log("== Active WhatsApp accounts ==");
  const accts = await prisma.$queryRaw`
    SELECT id, "organizationId", "phoneNumberId", "wabaId", "isActive", "displayPhoneNumber"
    FROM whatsapp_accounts ORDER BY "createdAt" DESC LIMIT 20`;
  for (const a of accts)
    console.log(`org=${a.organizationId} pnid=${a.phoneNumberId} waba=${a.wabaId} active=${a.isActive} disp=${a.displayPhoneNumber}`);

  const active = new Set(accts.filter((a) => a.isActive).map((a) => a.phoneNumberId));

  console.log("\n== phone_number_id of LOST (unprocessed) message events ==");
  const pending = await prisma.$queryRaw`
    SELECT id, "createdAt", payload FROM webhook_events
    WHERE source='whatsapp' AND "processedAt" IS NULL AND "createdAt" > ${since}
    ORDER BY "createdAt" DESC LIMIT 30`;
  const seen = new Map();
  for (const r of pending) {
    for (const m of meta(r.payload)) {
      if (!m.hasMsg) continue;
      const key = m.phoneNumberId;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  for (const [pnid, n] of seen)
    console.log(`pnid=${pnid} lostEvents=${n} mappedToActiveAccount=${active.has(pnid)}`);

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
