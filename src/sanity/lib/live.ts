/**
 * Live Content API. Queries made through `sanityFetch` stay up to date without a
 * rebuild; `<SanityLive />` must be rendered once in the root layout for that to
 * work. Wired up when the first real query lands (commit 5).
 */

import { defineLive } from "next-sanity/live";

import { client } from "@/sanity/lib/client";

export const { sanityFetch, SanityLive } = defineLive({ client });
