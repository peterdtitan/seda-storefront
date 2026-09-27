/**
 * The size run, in the order it is shown.
 *
 * It lives here rather than beside the Sanity schema because both the editor forms and
 * the schema need it, and the schema module imports the whole `sanity` package. A
 * client component reaching for SIZES through that file pulls Studio into the browser
 * bundle — so the shared constant sits in a module with no dependencies at all.
 */
export const SIZES = ["S", "M", "L", "XL"] as const;

export type Size = (typeof SIZES)[number];

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}
