/**
 * A cart line holds identifiers only. Prices, names and images are re-read from the
 * CMS whenever the bag renders, so a tampered cookie cannot change what anything
 * costs and a price edit is reflected in an abandoned cart.
 */
export type CartLine = {
  productSlug: string;
  colourSlug: string;
  size: string;
  quantity: number;
};

export type Cart = CartLine[];

export const CART_COOKIE = "seda_bag";
export const MAX_LINES = 40;
export const MAX_QUANTITY = 10;

export function lineKey(line: Pick<CartLine, "productSlug" | "colourSlug" | "size">) {
  return `${line.productSlug}|${line.colourSlug}|${line.size}`;
}

/** Compact on purpose: the whole cart has to fit in a 4KB cookie. */
type Wire = { s: string; c: string; z: string; q: number };

export function serialiseCart(cart: Cart): string {
  const wire: Wire[] = cart.slice(0, MAX_LINES).map((line) => ({
    s: line.productSlug,
    c: line.colourSlug,
    z: line.size,
    q: line.quantity,
  }));
  return encodeURIComponent(JSON.stringify(wire));
}

export function parseCart(value: string | undefined | null): Cart {
  if (!value) return [];

  try {
    const raw = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(raw)) return [];

    return raw
      .flatMap((entry: unknown) => {
        if (!entry || typeof entry !== "object") return [];
        const e = entry as Partial<Wire>;
        if (typeof e.s !== "string" || typeof e.c !== "string" || typeof e.z !== "string") {
          return [];
        }
        const quantity = Math.floor(Number(e.q));
        if (!Number.isFinite(quantity) || quantity < 1) return [];

        return [
          {
            productSlug: e.s.slice(0, 96),
            colourSlug: e.c.slice(0, 96),
            size: e.z.slice(0, 8),
            quantity: Math.min(quantity, MAX_QUANTITY),
          },
        ];
      })
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export function cartCount(cart: Cart): number {
  return cart.reduce((total, line) => total + line.quantity, 0);
}
