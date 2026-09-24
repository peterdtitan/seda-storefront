import "server-only";

import type { Cart } from "@/lib/cart/types";
import { unitsInStock, type Product } from "@/lib/catalogue";
import { sanityFetch } from "@/sanity/lib/client";
import { BAG_QUERY } from "@/sanity/lib/queries";

export type PricedLine = {
  productSlug: string;
  productName: string;
  colourSlug: string;
  colourName: string;
  size: string;
  quantity: number;
  unitKobo: number;
  lineKobo: number;
};

export type PricedCart =
  | {
      ok: true;
      lines: PricedLine[];
      subtotalKobo: number;
      deliveryKobo: number;
      totalKobo: number;
    }
  | { ok: false; reason: "empty" | "unavailable" | "stock"; message: string };

/** Lagos delivery is free and the bag page says so. */
const DELIVERY_KOBO = 0;

/**
 * The only place a total is decided.
 *
 * The cookie holds identifiers and quantities, nothing else, so every price here is
 * read from the CMS at the moment of checkout. Stock is re-checked too: the bag page
 * may have been open for an hour, and overselling a one-off garment is worse than
 * losing the sale.
 */
export async function priceCart(cart: Cart): Promise<PricedCart> {
  if (cart.length === 0) {
    return { ok: false, reason: "empty", message: "Your bag is empty." };
  }

  const slugs = [...new Set(cart.map((line) => line.productSlug))];
  const products = await sanityFetch<Product[]>(BAG_QUERY, { slugs });

  if (!products) {
    return {
      ok: false,
      reason: "unavailable",
      message: "We cannot price your bag right now. Please try again in a moment.",
    };
  }

  const lines: PricedLine[] = [];

  for (const line of cart) {
    const product = products.find((p) => p.slug === line.productSlug);
    const colourway = product?.colourways?.find((c) => c.slug === line.colourSlug);
    if (!product || !colourway) {
      return {
        ok: false,
        reason: "stock",
        message: "Something in your bag is no longer available. Open your bag to review it.",
      };
    }

    const available = colourway.stock?.find((row) => row.size === line.size)?.quantity ?? 0;
    if (available < line.quantity) {
      return {
        ok: false,
        reason: "stock",
        message:
          unitsInStock(colourway) === 0
            ? `${product.name} in ${colourway.name} has sold out. Open your bag to review it.`
            : `Only ${available} left of ${product.name} in ${colourway.name}, ${line.size}.`,
      };
    }

    lines.push({
      productSlug: product.slug,
      productName: product.name,
      colourSlug: colourway.slug,
      colourName: colourway.name,
      size: line.size,
      quantity: line.quantity,
      unitKobo: product.priceKobo,
      lineKobo: product.priceKobo * line.quantity,
    });
  }

  const subtotalKobo = lines.reduce((total, line) => total + line.lineKobo, 0);

  return {
    ok: true,
    lines,
    subtotalKobo,
    deliveryKobo: DELIVERY_KOBO,
    totalKobo: subtotalKobo + DELIVERY_KOBO,
  };
}
