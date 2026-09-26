/** Where the site believes it lives.
 *
 * Absolute URLs are needed in four places that cannot ask the browser: metadataBase,
 * canonical links, Open Graph images and the sitemap. Vercel gives every preview its
 * own hostname, so the origin is resolved rather than hard-coded — otherwise a preview
 * would advertise production URLs and invite Google to index a branch.
 */

/** Only a fallback, for a local run with nothing configured. The real value comes from
 * NEXT_PUBLIC_SITE_URL, so moving the shop to another domain is an environment change
 * rather than a code change. */
const FALLBACK_ORIGIN = "https://pieceofseda.com";

function resolveOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Set by Vercel on every deployment, without a scheme.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : FALLBACK_ORIGIN;
}

export const siteOrigin = resolveOrigin();

export const siteUrl = new URL(siteOrigin);

/**
 * Only the real deployment should be crawlable.
 *
 * Decided by VERCEL_ENV rather than by comparing the origin to a constant. The same
 * environment variables are pushed to preview and production, so an origin match
 * cannot tell them apart — and getting it wrong means either a preview competing with
 * the shop for its own queries, or the shop serving Disallow: / to everyone.
 *
 * Outside Vercel there is no VERCEL_ENV, so a self-hosted production build is trusted
 * to be what it says it is.
 */
export const isProductionSite =
  process.env.VERCEL_ENV === "production" ||
  (process.env.VERCEL_ENV === undefined && process.env.NODE_ENV === "production");

export const SITE = {
  name: "Șèdá",
  title: "Șèdá — Contemporary Adire",
  description:
    "Contemporary Adire for everyday life. Hand-dyed in Lagos, made in short runs. Made in Nigeria, designed for it too.",
  locale: "en_NG",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin).toString();
}
