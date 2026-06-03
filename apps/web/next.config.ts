import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@growthsync/shared"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  /** Required for Facebook Login / WhatsApp Embedded Signup popup (FB.login). */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
