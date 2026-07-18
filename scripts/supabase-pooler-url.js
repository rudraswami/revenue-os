/**
 * Build Supabase transaction pooler URL for serverless (Vercel).
 * Direct db.*.supabase.co:5432 is not reachable from Vercel serverless.
 */
function toPoolerDatabaseUrl({ databaseUrl, directUrl, projectId, region, poolerHost }) {
  const current = databaseUrl || "";
  if (current.includes("pooler.supabase.com") && current.includes(":6543")) {
    return current;
  }

  const source = directUrl || databaseUrl || "";
  const refMatch = source.match(/@db\.([^.]+)\.supabase\.co/);
  const passMatch = source.match(/postgresql:\/\/postgres:([^@]+)@/);
  const ref = projectId || (refMatch ? refMatch[1] : "");
  const password = passMatch ? passMatch[1] : "";

  if (!ref || !password) {
    return databaseUrl || "";
  }

  const host =
    poolerHost?.trim() ||
    (region?.trim() ? `aws-1-${region.trim()}.pooler.supabase.com` : "");
  if (!host) {
    return databaseUrl || "";
  }

  return `postgresql://postgres.${ref}:${password}@${host}:6543/postgres?pgbouncer=true`;
}

module.exports = { toPoolerDatabaseUrl };
