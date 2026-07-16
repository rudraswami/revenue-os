import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "apps/api/.env.vercel.audit");
const raw = readFileSync(envPath, "utf8");

function get(key) {
  const line = raw.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return "";
  let val = line.slice(key.length + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  // Mirror apps/api sanitizeEnvValue
  let v = val.replace(/\r/g, "").trim();
  while (/\\r\\n$|\\n$|\\r$/.test(v)) {
    v = v.replace(/\\r\\n$|\\n$|\\r$/, "").trim();
  }
  return v;
}

const appId = get("META_APP_ID");
const configId = get("META_EMBEDDED_SIGNUP_CONFIG_ID");
const secret = get("META_APP_SECRET");
const webUrl = get("NEXT_PUBLIC_APP_URL");
const apiVersion = get("WHATSAPP_API_VERSION");
const embeddedLive = get("WHATSAPP_EMBEDDED_SIGNUP_LIVE");
const solutionId = get("META_PARTNER_SOLUTION_ID");

const checks = [];

function ok(id, pass, detail) {
  checks.push({ id, ok: pass, detail });
}

ok("meta_app_id", appId === "1694805491426991", `META_APP_ID=${appId || "(missing)"}`);
ok(
  "meta_config_id",
  configId === "1529235155408813",
  `META_EMBEDDED_SIGNUP_CONFIG_ID=${configId || "(missing)"}`,
);
ok("meta_app_secret", secret.length > 10, secret ? "META_APP_SECRET set" : "META_APP_SECRET missing");
ok("web_url", webUrl.includes("growvisi.in"), `NEXT_PUBLIC_APP_URL=${webUrl || "(missing)"}`);
ok("embedded_live", embeddedLive === "true", `WHATSAPP_EMBEDDED_SIGNUP_LIVE=${embeddedLive || "(unset)"}`);
ok(
  "partner_solution_id",
  !!solutionId,
  solutionId ? `META_PARTNER_SOLUTION_ID=${solutionId}` : "META_PARTNER_SOLUTION_ID not set (required for Tech Provider embedded signup)",
);
ok("api_version", !!apiVersion, `WHATSAPP_API_VERSION=${apiVersion || "(default v22)"}`);

// CRLF pollution check (raw file)
const metaLine = raw.split(/\r?\n/).find((l) => l.startsWith("META_APP_ID=")) ?? "";
const hasTrailingGarbage = /\\r\\n"|"\s*$/.test(metaLine) || metaLine.includes("\r");
ok(
  "env_crlf_clean",
  !hasTrailingGarbage,
  hasTrailingGarbage
    ? "Vercel env may include CRLF — API sanitizeEnvValue() trims at runtime"
    : "Env line format OK",
);

if (appId && secret) {
  const token = `${appId}|${secret}`;
  const version = apiVersion || "v21.0";
  const res = await fetch(
    `https://graph.facebook.com/${version}/${appId}?fields=name,category,app_domains,restrictions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await res.json();
  if (body.error) {
    ok("graph_app", false, body.error.message);
  } else {
    ok("graph_app", true, `App "${body.name}" reachable`);
    const domains = Array.isArray(body.app_domains) ? body.app_domains : [];
    ok(
      "app_domains",
      domains.some((d) => String(d).includes("growvisi.in")),
      `Graph app_domains: ${domains.join(", ") || "(none — set in Meta Basic)"}`,
    );
  }
}

console.log(JSON.stringify({ checks, blockers: [
  "Meta prerequisite: must be approved Tech Provider or Solution Partner (business verification alone is not enough)",
  "Meta: Facebook Login for Business → Allowed Domains must include growvisi.in + www.growvisi.in",
  "Meta: App Review → public_profile Advanced access (common Feature Unavailable fix)",
  "Meta: App Review → whatsapp_business_management + messaging Advanced access",
  "Meta: Domain Manager (Advanced) must list growvisi.in domains",
  "Optional: META_PARTNER_SOLUTION_ID for Tech Provider (Twilio/Meta TP guide)",
]}, null, 2));
