import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vestra/ui", "@vestra/types"],
  reactStrictMode: true,
};

export default nextConfig;
