/** Strip CRLF, literal `\\r\\n` suffixes, and whitespace from env values (Windows Vercel CLI quirk). */
export function sanitizeEnvValue(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let v = String(value).replace(/\r/g, "").trim();
  // Vercel CLI on Windows has stored literal backslash-r-backslash-n inside values.
  while (/\\r\\n$|\\n$|\\r$/.test(v)) {
    v = v.replace(/\\r\\n$|\\n$|\\r$/, "").trim();
  }
  return v || undefined;
}

/** Custom domain + Vercel preview aliases (legacy revenue-os-web project names included). */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([\w-]+\.)?growvisi\.com$/,
  /^https:\/\/([\w-]+\.)?growvisi\.in$/,
  /^https:\/\/revenue-os-web[\w.-]*\.vercel\.app$/,
  /^https:\/\/growvisi-web[\w.-]*\.vercel\.app$/,
];

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (getAllowedOrigins().includes(origin)) {
    return true;
  }
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export function getAllowedOrigins(): string[] {
  const extra =
    process.env.CORS_ORIGINS?.split(",").map((o) => sanitizeEnvValue(o)).filter(Boolean) ?? [];
  const fromEnv = [
    sanitizeEnvValue(process.env.NEXT_PUBLIC_APP_URL),
    ...extra,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean) as string[];

  return [...new Set(fromEnv)];
}
