/**
 * Money. Prices are stored in the CMS as an integer number of KOBO (₦1 = 100 kobo)
 * and formatted at the edge. Never store or pass a display string: "₦48,000" cannot
 * be summed, compared, or handed to Paystack, and it silently encodes a locale.
 */

export const KOBO_PER_NAIRA = 100;

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  // The catalogue is priced in whole naira. Showing "₦48,000.00" adds two digits of
  // false precision to every price in the design.
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 4_800_000 → "₦48,000" */
export function formatNaira(kobo: number): string {
  return nairaFormatter.format(kobo / KOBO_PER_NAIRA);
}

/** 48_000 → 4_800_000. For seeding and for reading human input. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}
