import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { sanityFetch } from "@/sanity/lib/client";
import { PRODUCT_SLUGS_QUERY } from "@/sanity/lib/queries";

// Same reason as robots.ts, plus a second one: a build-time snapshot of the product
// list goes stale the moment a piece is added, and crawlers read this rarely enough
// that a query per request costs nothing.
export const dynamic = "force-dynamic";

const STATIC: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/shop", priority: 0.9, changeFrequency: "weekly" },
  { path: "/lookbook", priority: 0.7, changeFrequency: "monthly" },
  { path: "/story", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // A CMS outage must not take the sitemap down with it; the static routes still
  // exist and are still worth submitting.
  const slugs = (await sanityFetch<string[]>(PRODUCT_SLUGS_QUERY)) ?? [];

  return [
    ...STATIC.map((entry) => ({
      url: absoluteUrl(entry.path),
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/product/${slug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
