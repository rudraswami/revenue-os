#!/usr/bin/env node
/**
 * Create Meta App Review test account (idempotent).
 * Usage: dotenv -e .env -- node scripts/seed-meta-reviewer.js
 */
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const EMAIL = (process.env.SEED_META_REVIEWER_EMAIL ?? "meta.reviewer@growvisi.in").toLowerCase();
const PASSWORD = process.env.SEED_META_REVIEWER_PASSWORD ?? "MetaReview2026!Growvisi";
const NAME = process.env.SEED_META_REVIEWER_NAME ?? "Meta Reviewer";
const ORG = process.env.SEED_META_REVIEWER_ORG ?? "Meta Review Demo";

const STAGES = [
  ["NEW", "New", 0, "#6366f1", false, false],
  ["CONTACTED", "Contacted", 1, "#8b5cf6", false, false],
  ["QUALIFIED", "Qualified", 2, "#a855f7", false, false],
  ["PROPOSAL", "Proposal", 3, "#d946ef", false, false],
  ["NEGOTIATION", "Negotiation", 4, "#ec4899", false, false],
  ["WON", "Won", 5, "#22c55e", true, false],
  ["LOST", "Lost", 6, "#ef4444", false, true],
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      const member = await prisma.organizationMember.findFirst({
        where: { userId: existing.id },
        include: { organization: true },
      });
      console.log(`Already exists: ${EMAIL}`);
      console.log(`  Org: ${member?.organization?.name} (${member?.organization?.slug})`);
      return;
    }

    const slug = slugify(ORG);
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: EMAIL, passwordHash, name: NAME, emailVerified: new Date() },
      });
      const organization = await tx.organization.create({ data: { name: ORG, slug } });
      await tx.organizationMember.create({
        data: { organizationId: organization.id, userId: user.id, role: "OWNER" },
      });
      await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: "Default",
          slug: "default",
          isDefault: true,
        },
      });
      await tx.pipelineStage.createMany({
        data: STAGES.map(([stage, name, order, color, isWon, isLost]) => ({
          organizationId: organization.id,
          leadStage: stage,
          name,
          order,
          color,
          isWon,
          isLost,
        })),
      });
      await tx.subscription.create({
        data: { organizationId: organization.id, planId: "trial", status: "TRIALING" },
      });
      console.log(`Created ${EMAIL}`);
      console.log(`  Org: ${ORG} (slug: ${slug})`);
      console.log(`  Password: ${PASSWORD}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
