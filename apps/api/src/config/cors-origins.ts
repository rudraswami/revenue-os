/** Strip CRLF and whitespace accidentally added via Windows shells / Vercel CLI. */
export function sanitizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Production: custom domain + Vercel preview aliases (incl. legacy growthsync-web). */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([\w-]+\.)?growthsync\.in$/,
  /^https:\/\/growthsync-web[\w.-]*\.vercel\.app$/,
  /^https:\/\/growthsync-web[\w.-]*\.vercel\.app$/,
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
