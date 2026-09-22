import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev otherwise regenerates AGENTS.md/CLAUDE.md on every run and dirties the tree.
  agentRules: false,
  images: {
    // Product photography is served from the Sanity image pipeline, never /public.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
};

export default nextConfig;
