import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

function loadRootEnv() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.replace(/\r$/, "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadRootEnv();

const DEMO_SLUG = process.env.SEED_ORG_SLUG ?? "demo-company";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { slug: DEMO_SLUG },
    include: { workspaces: { take: 1 } },
  });
  if (!org) {
    throw new Error(`Organization slug "${DEMO_SLUG}" not found — run pnpm db:seed first.`);
  }

  let wa = await prisma.whatsappAccount.findFirst({
    where: { organizationId: org.id, isActive: true },
  });
  if (!wa) {
    wa = await prisma.whatsappAccount.create({
      data: {
        organizationId: org.id,
        phoneNumberId: `cert-phone-${org.id.slice(-6)}`,
        wabaId: `cert-waba-${org.id.slice(-6)}`,
        displayPhoneNumber: "+919876543210",
        verifiedName: "Cert Fixture",
        accessTokenEnc: "cert-fixture-token",
        isActive: true,
      },
    });
    console.log("Created WhatsApp account:", wa.id);
  } else {
    console.log("Reusing WhatsApp account:", wa.id);
  }

  const workspaceId = org.workspaces[0]?.id ?? null;
  const existing = await prisma.conversation.count({
    where: { organizationId: org.id, status: "OPEN" },
  });
  if (existing >= 2) {
    const sample = await prisma.conversation.findFirst({
      where: { organizationId: org.id },
      select: { id: true },
      orderBy: { lastMessageAt: "desc" },
    });
    console.log(`Already have ${existing} conversations — cert fixture OK (sample: ${sample?.id})`);
    if (sample?.id) console.log(`CERTIFY_CONVERSATION_ID=${sample.id}`);
    return;
  }

  const contacts = [
    { phone: "+919811111111", name: "Cert Lead A" },
    { phone: "+919822222222", name: "Cert Lead B" },
  ];

  for (const [i, contact] of contacts.entries()) {
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        phone: contact.phone,
        displayName: contact.name,
        source: "cert-fixture",
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: org.id,
        workspaceId,
        whatsappAccountId: wa.id,
        waConversationKey: `cert:${contact.phone}`,
        contactPhone: contact.phone,
        contactName: contact.name,
        leadId: lead.id,
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        unreadCount: 1,
      },
    });

    await prisma.message.create({
      data: {
        organizationId: org.id,
        conversationId: conversation.id,
        waMessageId: `cert-msg-${conversation.id}`,
        direction: "INBOUND",
        type: "TEXT",
        status: "DELIVERED",
        content: `Certification fixture message ${i + 1}`,
      },
    });

    console.log("Created conversation:", conversation.id, contact.name);
    if (i === 0) console.log(`CERTIFY_CONVERSATION_ID=${conversation.id}`);
  }

  console.log("Inbox cert fixture ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
