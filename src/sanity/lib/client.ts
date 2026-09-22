import { createClient } from "next-sanity";

import {
  apiVersion,
  dataset,
  isSanityConfigured,
  projectId,
  warnIfUnconfigured,
} from "@/sanity/env";

export const client = isSanityConfigured
  ? createClient({ projectId, dataset, apiVersion, useCdn: true })
  : null;

/**
 * Every read goes through here. A CMS that is unreachable or unconfigured returns null
 * and the caller falls back; it never takes a page or a build down with it.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T | null> {
  if (!client) {
    warnIfUnconfigured("a CMS query");
    return null;
  }

  try {
    return await client.fetch<T>(query, params);
  } catch (error) {
    console.error("[sanity] query failed", { query, error });
    return null;
  }
}
