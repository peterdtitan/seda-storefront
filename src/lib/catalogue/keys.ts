/**
 * Sanity gives every array item a _key and uses it to address that item forever. The
 * forms add rows in the browser, so keys have to be mintable on both sides.
 */
export function newKey(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/** Slugify the way Studio's slugifier does, so a name typed here and a name typed in
 * Studio produce the same URL. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
