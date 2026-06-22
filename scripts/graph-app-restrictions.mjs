import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/api/.env.audit.tmp");
const raw = readFileSync(envPath, "utf8");

function get(key) {
  const line = raw.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return "";
  let v = line.slice(key.length + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.replace(/\r/g, "").trim();
  while (/\\r\\n$|\\n$|\\r$/.test(v)) v = v.replace(/\\r\\n$|\\n$|\\r$/, "").trim();
  return v;
}

const appId = get("META_APP_ID");
const secret = get("META_APP_SECRET");
const version = get("WHATSAPP_API_VERSION") || "v21.0";

const fields = [
  "name",
  "app_domains",
  "category",
  "restrictions",
  "daily_active_users",
  "weekly_active_users",
].join(",");

const res = await fetch(`https://graph.facebook.com/${version}/${appId}?fields=${fields}`, {
  headers: { Authorization: `Bearer ${appId}|${secret}` },
});
const body = await res.json();
console.log(JSON.stringify(body, null, 2));
