import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@growth/lead-engine", "@growth/scoring"],
};

export default nextConfig;
