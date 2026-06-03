import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@revenue-os/shared"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
