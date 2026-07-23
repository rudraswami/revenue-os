/**
 * Repair a custom/B2B workspace polluted by prior industry handbook testing.
 *
 * Usage:
 *   DIRECT_URL=... pnpm exec tsx scripts/repair-custom-industry-workspace.ts nayeez@gmail.com
 */
import { PrismaClient } from "@prisma/client";
import {
  CUSTOM_INDUSTRY_ID,
  KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK,
  normalizeInrPricingInContent,
  normalizeBusinessEmployeeProfile,
  profileHasHandbookPollution,
  resetHandbookDerivedProfile,
} from "@growvisi/shared";

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm exec tsx scripts/repair-custom-industry-workspace.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true } } },
  });
  if (!user?.memberships[0]?.organization) {
    console.error(`No org for ${email}`);
    process.exit(1);
  }

  const org = user.memberships[0].organization;
  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const intelligence = (settings.intelligence ?? {}) as Record<string, unknown>;
  const industryId = intelligence.industryId as string | undefined;
  const businessProfile = normalizeBusinessEmployeeProfile(
    intelligence.businessProfile ?? settings.businessProfile,
    org.name,
  );

  if (industryId !== CUSTOM_INDUSTRY_ID) {
    console.log(`Org ${org.name} is industryId=${industryId} — repair only runs for custom.`);
    process.exit(0);
  }

  const purged = await prisma.knowledgeDocument.deleteMany({
    where: { organizationId: org.id, sourceType: KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK },
  });

  const pricingDocs = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId: org.id,
      OR: [
        { category: "pricing" },
        { title: { contains: "pricing", mode: "insensitive" } },
        { title: { contains: "plan", mode: "insensitive" } },
      ],
    },
  });

  let pricingUpdated = 0;
  for (const doc of pricingDocs) {
    const raw = doc.rawContent ?? "";
    const normalized =
      doc.category === "pricing" || /\bplan\b/i.test(raw)
        ? normalizeInrPricingInContent(raw)
        : raw;
    if (normalized !== raw) {
      await prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { rawContent: normalized, status: "pending" },
      });
      pricingUpdated += 1;
    }
  }

  let profileRepaired = false;
  if (profileHasHandbookPollution(businessProfile)) {
    const resetProfile = resetHandbookDerivedProfile(org.name, businessProfile);
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        settings: {
          ...settings,
          intelligence: {
            ...intelligence,
            businessProfile: resetProfile,
          },
        } as object,
      },
    });
    profileRepaired = true;
  }

  console.log(
    JSON.stringify(
      {
        orgId: org.id,
        orgName: org.name,
        handbookDocsPurged: purged.count,
        pricingDocsRenormalized: pricingUpdated,
        profileRepaired,
        thanksAfter: profileRepaired
          ? resetHandbookDerivedProfile(org.name, businessProfile).courtesyTemplates.thanks
          : businessProfile.courtesyTemplates.thanks,
      },
      null,
      2,
    ),
  );

  if (pricingUpdated > 0) {
    console.log("\nRe-embed pricing docs from the API or wait for the embed worker.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
