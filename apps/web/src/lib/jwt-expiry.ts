/** Seconds until JWT `exp`, or null if missing / unparsable. */
export function jwtExpiresInSec(accessToken: string): number | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
    return payload.exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  if (typeof atob === "undefined") {
    return Buffer.from(padded + pad, "base64").toString("utf8");
  }
  return atob(padded + pad);
}
