const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const skip = /node_modules|\.git|pnpm-lock|\.next|dist|\.env\.(check|verify|meta-check|api\.check)/;
const ext = /\.(ts|tsx|json|md|yml|yaml|prisma|ps1|toml|example)$/;

function transform(content) {
  return content
    .replace(/@revenue-os\//g, "@growthsync/")
    .replace(/Revenue OS/g, "GrowthSync")
    .replace(/revenue-os-api/g, "growthsync-api")
    .replace(/revenue-os-web/g, "growthsync-web")
    .replace(/revenue-os/g, "growthsync")
    .replace(/revenue_os/g, "growthsync")
    .replace(/demo@growthsync\.local/g, "demo@growthsync.in");
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (skip.test(full)) continue;
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!ext.test(entry.name) && entry.name !== "Dockerfile") continue;
    const before = fs.readFileSync(full, "utf8");
    const after = transform(before);
    if (after !== before) fs.writeFileSync(full, after);
  }
}

walk(root);
console.log("Rebrand complete");
