/**
 * Generate Prisma client after install (local dev).
 * Skipped on Vercel — `turbo build` runs prisma generate in @revenue-os/database.
 */
const { execSync } = require("child_process");
const path = require("path");

if (process.env.VERCEL === "1" || process.env.CI === "true") {
  console.log("[postinstall] Skipping prisma generate on Vercel/CI (build step handles it).");
  process.exit(0);
}

const schema = path.join(__dirname, "..", "packages", "database", "prisma", "schema.prisma");
try {
  execSync(`pnpm exec prisma generate --schema="${schema}"`, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
} catch (e) {
  console.warn("[postinstall] prisma generate failed — run: pnpm db:generate");
  process.exit(0);
}
