/**
 * CI drift guard for Prisma Migrate.
 *
 * Fails if the committed migrations under packages/database/prisma/migrations
 * do not reproduce packages/database/prisma/schema.prisma — i.e. someone edited
 * schema.prisma without generating a matching migration.
 *
 * Strategy: after `prisma migrate deploy` has been run against the CI database,
 * diff that live database against the schema datamodel. A clean repo produces an
 * empty diff, EXCEPT for expression indexes that cannot be represented in
 * schema.prisma (currently only `conversations_org_contact_search_idx`). Those
 * known raw objects are filtered out; anything else means real drift.
 *
 * Usage (CI, DATABASE_URL points at the already-migrated DB):
 *   node scripts/check-prisma-drift.js
 */
const { execFileSync } = require("child_process");
const path = require("path");

const DB_PACKAGE = path.join(__dirname, "..", "packages", "database");
const SCHEMA = path.join(DB_PACKAGE, "prisma", "schema.prisma");

// Raw / expression-only objects that intentionally live in migrations but cannot
// be expressed in schema.prisma. Diff lines mentioning these are expected noise.
const ALLOWED_RAW_OBJECTS = ["conversations_org_contact_search_idx"];

function runDiff() {
  return execFileSync(
    "pnpm",
    [
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-database",
      "--to-schema-datamodel",
      SCHEMA,
      "--script",
    ],
    { cwd: DB_PACKAGE, encoding: "utf8", env: process.env },
  );
}

function meaningfulLines(sql) {
  return sql
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith("--"))
    .filter((l) => !ALLOWED_RAW_OBJECTS.some((obj) => l.includes(obj)));
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "check-prisma-drift: DATABASE_URL is required (point it at the migrated CI database).",
    );
    process.exit(2);
  }

  let sql;
  try {
    sql = runDiff();
  } catch (err) {
    console.error("check-prisma-drift: failed to compute migration diff.");
    console.error(err.stdout || err.message || err);
    process.exit(2);
  }

  const residual = meaningfulLines(sql);
  if (residual.length > 0) {
    console.error(
      "\n❌ Prisma schema drift detected — migrations do not match schema.prisma.\n",
    );
    console.error("Unaccounted diff statements:\n");
    console.error(residual.join("\n"));
    console.error(
      "\nFix: run `pnpm --filter @growvisi/database migrate:dev --name <change>` " +
        "to generate a migration for your schema change, then commit it.\n",
    );
    process.exit(1);
  }

  console.log("✓ Prisma migrations reproduce schema.prisma (no drift).");
}

main();
