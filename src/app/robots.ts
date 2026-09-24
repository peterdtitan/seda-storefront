import type { MetadataRoute } from "next";

import { absoluteUrl, isProductionSite } from "@/lib/site";

// Prerendered, this bakes in whatever origin the build happened to see — which on a
// preview meant shipping production's robots.txt, inviting crawlers into a branch.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // A preview runs the same code against the same dataset. Left crawlable it would
  // compete with the real domain for its own queries, so only production opens up.
  if (!isProductionSite) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The bag is per-visitor and empty to a crawler; the rest is not public work.
        disallow: ["/studio", "/studio/", "/styleguide", "/bag", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
