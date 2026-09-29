import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    // Product photography is served from the Sanity image pipeline, never /public.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
  experimental: {
    serverActions: {
      // Photographs reach Sanity through a server action, and the default cap on one
      // is 1MB — under any photo a phone takes. 4.5MB is as high as this usefully
      // goes: Vercel refuses a larger function payload before Next ever sees it, so
      // the browser shrinks anything bigger first. See lib/catalogue/limits.ts.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
