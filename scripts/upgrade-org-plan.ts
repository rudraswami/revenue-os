/**
 * One-off: upgrade an org to a paid plan by user email. Usage:
 *   DIRECT_URL=... npx tsx scripts/upgrade-org-plan.ts nayeez@gmail.com growth
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
const planId = process.argv[3] ?? "growth";

if (!email) {
  console.error("Usage: tsx scripts/upgrade-org-plan.ts <email> [planId]");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { organization: { include: { subscription: true } } },
      },
    },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const membership = user.memberships[0];
  if (!membership) {
    console.error(`No organization for ${email}`);
    process.exit(1);
  }

  const org = membership.organization;
  console.log("Before:", {
    email: user.email,
    orgId: org.id,
    orgName: org.name,
    planId: org.subscription?.planId ?? "(none)",
    status: org.subscription?.status ?? "(none)",
  });

  const periodEnd = new Date();
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const subscription = await prisma.subscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      planId,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    update: {
      planId,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    },
  });

  console.log("After:", {
    email: user.email,
    orgId: org.id,
    planId: subscription.planId,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
