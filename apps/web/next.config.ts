import type { NextConfig } from "next";
import path from "path";

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.replace(/[\r\n]+/g, "").trim()).origin;
  } catch {
    return null;
  }
}

const isDev = process.env.NODE_ENV !== "production";
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL) ?? "";
const wsOrigin = originOf(process.env.NEXT_PUBLIC_WS_URL) ?? "";
const wsScheme = wsOrigin.replace(/^http/, "ws");

// Facebook JS SDK Embedded Signup calls these hosts after the login popup closes
// (oauth/status, impression.php). Omitting www.facebook.com breaks FB.login.
const facebookConnectHosts = [
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://business.facebook.com",
  "https://graph.facebook.com",
  "https://connect.facebook.net",
  "https://*.facebook.com",
  "https://*.fbcdn.net",
].join(" ");

const connectSrc = [
  "'self'",
  apiOrigin,
  wsOrigin,
  wsScheme,
  facebookConnectHosts,
  isDev ? "http://localhost:4000 http://127.0.0.1:4000 ws://localhost:4000 ws://127.0.0.1:4000" : "",
]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; FB SDK is loaded from connect.facebook.net.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-src 'self' https://www.facebook.com https://web.facebook.com https://business.facebook.com https://staticxx.facebook.com https://connect.facebook.net",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // FB Login popup may POST back to facebook.com during OAuth handoff
  "form-action 'self' https://www.facebook.com https://web.facebook.com",
  "object-src 'none'",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@growvisi/shared"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  /** Security headers. COOP is required for the Facebook Login / Embedded Signup popup. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
