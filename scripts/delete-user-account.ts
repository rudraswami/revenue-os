/**
 * One-off: permanently delete a user account (and sole-owner workspaces).
 * Usage: pnpm --filter @growvisi/database exec tsx scripts/delete-user-account.ts <email>
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

for (const p of [
  resolve(repoRoot, ".env"),
  resolve(repoRoot, ".env.supabase.new"),
  resolve(repoRoot, "apps/api/.env.vercel.pull"),
  resolve(repoRoot, "apps/api/.env.production.local"),
  resolve(repoRoot, ".env.local"),
]) {
  loadEnvFile(p);
}

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: tsx scripts/delete-user-account.ts <email>");
  process.exit(1);
}

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("FAILED: DATABASE_URL or DIRECT_URL not set. Run: vercel env pull apps/api/.env.vercel.pull --environment=production");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    console.log(`NOT_FOUND: ${email}`);
    process.exit(1);
  }

  const owned = user.memberships.filter((m) => m.role === "OWNER");
  for (const m of owned) {
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: m.organizationId },
    });
    if (memberCount > 1) {
      console.error(
        `BLOCKED: user owns workspace "${m.organization.name}" with ${memberCount} members. Transfer ownership first.`,
      );
      process.exit(1);
    }
  }

  const ownedOrgIds = owned.map((m) => m.organizationId);

  await prisma.$transaction(async (tx) => {
    for (const orgId of ownedOrgIds) {
      await tx.organization.delete({ where: { id: orgId } });
    }

    await tx.organizationMember.deleteMany({ where: { userId: user.id } });
    await tx.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.user.delete({ where: { id: user.id } });
  });

  console.log(
    `DELETED: ${email} (user + ${ownedOrgIds.length} sole-owner workspace${ownedOrgIds.length === 1 ? "" : "s"})`,
  );
}

main()
  .catch((err) => {
    console.error("FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
