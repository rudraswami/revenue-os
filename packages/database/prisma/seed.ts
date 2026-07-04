import { PrismaClient } from "@prisma/client";
import { ensureSeedAccount } from "./seed-accounts";

const prisma = new PrismaClient();

const ACCOUNTS = [
  {
    email: process.env.SEED_USER_EMAIL ?? "demo@growvisi.com",
    password: process.env.SEED_USER_PASSWORD ?? "demo123456",
    name: "Demo Admin",
    organizationName: process.env.SEED_ORG_NAME ?? "Demo Company",
  },
  {
    email: process.env.SEED_META_REVIEWER_EMAIL ?? "meta.reviewer@growvisi.in",
    password: process.env.SEED_META_REVIEWER_PASSWORD ?? "MetaReview2026!Growvisi",
    name: "Meta Reviewer",
    organizationName: process.env.SEED_META_REVIEWER_ORG ?? "Meta Review Demo",
    subscriptionPlanId: "pro",
    subscriptionStatus: "ACTIVE",
  },
] as const;

async function main() {
  for (const account of ACCOUNTS) {
    const result = await ensureSeedAccount(account);
    if (result.created) {
      console.log(`Created ${result.email} → org "${result.organization?.name}" (slug: ${result.organization?.slug})`);
      console.log(`  Password: ${account.password}`);
    } else {
      console.log(`Skipped ${result.email} (already exists, org: ${result.organization?.slug ?? "n/a"})`);
    }
  }
  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
