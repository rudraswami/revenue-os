import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "demo@growvisi.com";
  const password = process.env.SEED_USER_PASSWORD ?? "demo123456";
  const orgName = process.env.SEED_ORG_NAME ?? "Demo Company";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed skipped: user ${email} already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: "Demo Admin",
        emailVerified: new Date(),
      },
    });

    const organization = await tx.organization.create({
      data: { name: orgName, slug },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    await tx.workspace.create({
      data: {
        organizationId: organization.id,
        name: "Default",
        slug: "default",
        isDefault: true,
      },
    });

    const stages = [
      { stage: "NEW", name: "New", order: 0, color: "#6366f1" },
      { stage: "CONTACTED", name: "Contacted", order: 1, color: "#8b5cf6" },
      { stage: "QUALIFIED", name: "Qualified", order: 2, color: "#a855f7" },
      { stage: "PROPOSAL", name: "Proposal", order: 3, color: "#d946ef" },
      { stage: "NEGOTIATION", name: "Negotiation", order: 4, color: "#ec4899" },
      { stage: "WON", name: "Won", order: 5, color: "#22c55e", isWon: true },
      { stage: "LOST", name: "Lost", order: 6, color: "#ef4444", isLost: true },
    ] as const;

    await tx.pipelineStage.createMany({
      data: stages.map((s) => ({
        organizationId: organization.id,
        leadStage: s.stage,
        name: s.name,
        order: s.order,
        color: s.color,
        isWon: "isWon" in s ? s.isWon : false,
        isLost: "isLost" in s ? s.isLost : false,
      })),
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: "trial",
        status: "TRIALING",
      },
    });

    return { user, organization };
  });

  console.log("Seed complete");
  console.log(`  Organization: ${organization.name} (slug: ${organization.slug})`);
  console.log(`  Login email:  ${email}`);
  console.log(`  Password:     ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
