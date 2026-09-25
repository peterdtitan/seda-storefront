import "server-only";

import { createClient } from "next-sanity";

import { apiVersion, dataset, isSanityConfigured, projectId } from "@/sanity/env";

const token = process.env.SANITY_API_WRITE_TOKEN ?? "";

export const canWriteToSanity = isSanityConfigured && token.length > 0;

/** Separate from the read client: this one carries a token, must never use the CDN,
 * and is only ever reached from server code that has already taken a payment. */
export const writeClient = canWriteToSanity
  ? createClient({ projectId, dataset, apiVersion, token, useCdn: false })
  : null;
