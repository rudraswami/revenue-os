import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@revenue-os/shared"],
  reactStrictMode: true,
};

export default nextConfig;
