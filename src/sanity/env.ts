export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-09-22";

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";

export const isSanityConfigured = projectId.length > 0;

// I deliberately do not throw here. This module is evaluated while Next collects page
// data, so a throw takes down the whole build before a single route renders — which is
// how a preview deploy died with nothing but a stack trace. Missing config now degrades
// to an empty CMS read that the page falls back from, and shouts in the logs instead.
export function warnIfUnconfigured(where: string) {
  if (!isSanityConfigured) {
    console.error(
      `[sanity] NEXT_PUBLIC_SANITY_PROJECT_ID is not set — ${where} will render fallback content. ` +
        `Set it in .env.local locally and in the Vercel project for every environment.`,
    );
  }
}
