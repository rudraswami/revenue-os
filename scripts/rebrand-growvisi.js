const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const skip = /node_modules|\.git|pnpm-lock|\.next|dist|rebrand-growvisi\.js/;
const ext = /\.(ts|tsx|json|md|yml|yaml|prisma|ps1|toml|example|check|prod)$/;

function transform(content) {
  return content
    .replace(/GROWTHSYNC_/g, "GROWVISI_")
    .replace(/GrowthSync/g, "Growvisi")
    .replace(/@growthsync\//g, "@growvisi/")
    .replace(/growthsync-api/g, "growvisi-api")
    .replace(/growthsync-web/g, "growvisi-web")
    .replace(/growthsync\.in/g, "growvisi.com")
    .replace(/growthsync/g, "growvisi");
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (skip.test(full)) continue;
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!ext.test(entry.name) && entry.name !== "Dockerfile" && entry.name !== ".env.example") continue;
    const before = fs.readFileSync(full, "utf8");
    const after = transform(before);
    if (after !== before) fs.writeFileSync(full, after);
  }
}

walk(root);
console.log("Rebrand to Growvisi complete");
