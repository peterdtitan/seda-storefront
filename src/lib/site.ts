/** Where the site believes it lives.
 *
 * Absolute URLs are needed in four places that cannot ask the browser: metadataBase,
 * canonical links, Open Graph images and the sitemap. Vercel gives every preview its
 * own hostname, so the origin is resolved rather than hard-coded — otherwise a preview
 * would advertise production URLs and invite Google to index a branch. */

const PRODUCTION_ORIGIN = "https://wearseda.com";

function resolveOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Set by Vercel on every deployment, without a scheme.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : PRODUCTION_ORIGIN;
}

export const siteOrigin = resolveOrigin();

export const siteUrl = new URL(siteOrigin);

/** Only the real domain should be crawlable. Previews share the same code and the
 * same content, so left open they compete with production for the same queries. */
export const isProductionSite = siteOrigin === PRODUCTION_ORIGIN;

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
