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
        // The bag and checkout are per-visitor and empty to a crawler; the rest is
        // not public work. Both also carry noindex, which is what actually keeps
        // them out of an index — this just saves the crawl.
        disallow: [
          "/studio",
          "/studio/",
          "/styleguide",
          "/admin",
          "/admin/",
          "/superuser",
          "/superuser/",
          "/bag",
          "/checkout",
          "/api/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
