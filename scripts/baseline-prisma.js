/**
 * One-time baselining for an EXISTING production database that was created with
 * `prisma db push` (no `_prisma_migrations` history) and is now adopting Prisma
 * Migrate.
 *
 * It marks the committed migrations as already-applied WITHOUT running their SQL,
 * so `prisma migrate deploy` will not try to recreate existing tables. Run this
 * exactly once per pre-existing environment, then switch that environment's
 * deploy step to `pnpm db:deploy`.
 *
 * Fresh databases do NOT need this — they should run `pnpm db:deploy` directly.
 *
 * Usage (from repo root, with DIRECT_URL/DATABASE_URL set to the target DB):
 *   node scripts/baseline-prisma.js --confirm
 *
 * Safety:
 *  - Requires the explicit --confirm flag.
 *  - `migrate resolve --applied` is non-destructive: it only writes rows into
 *    `_prisma_migrations`; it never runs DDL/DML.
 */
const { execFileSync } = require("child_process");
const path = require("path");

const DB_PACKAGE = path.join(__dirname, "..", "packages", "database");

// Order matters: baseline first, then the raw-index migration.
const MIGRATIONS = ["0_init", "20260721000000_search_indexes"];

function resolveApplied(name) {
  console.log(`  → marking ${name} as applied…`);
  execFileSync(
    "pnpm",
    ["exec", "prisma", "migrate", "resolve", "--applied", name],
    { cwd: DB_PACKAGE, stdio: "inherit", env: process.env },
  );
}

function main() {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "Refusing to run without --confirm.\n" +
        "This baselines an EXISTING prod DB into Prisma Migrate history.\n" +
        "Run: node scripts/baseline-prisma.js --confirm",
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    console.error("Set DATABASE_URL (and ideally DIRECT_URL) to the target database first.");
    process.exit(1);
  }

  console.log("Baselining existing database into Prisma Migrate history…");
  for (const name of MIGRATIONS) {
    resolveApplied(name);
  }
  console.log(
    "\n✓ Done. `_prisma_migrations` now records the baseline as applied.\n" +
      "Verify with `pnpm --filter @growvisi/database exec prisma migrate status`,\n" +
      "then use `pnpm db:deploy` for all future migrations on this environment.",
  );
}

main();
