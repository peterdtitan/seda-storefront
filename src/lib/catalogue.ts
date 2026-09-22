import type { SanityImage } from "@/sanity/lib/types";

export type StockRow = { size: string; quantity: number };

export type Colourway = {
  name: string;
  slug: string;
  swatch: string;
  images: SanityImage[];
  stock: StockRow[];
};

export type Product = {
  _id: string;
  name: string;
  slug: string;
  priceKobo: number;
  category?: { title: string; slug: string };
  colourways: Colourway[];
};

/**
 * One card per product-colourway. The design shows three Dart Cargos cards for one
 * garment, so the grid's unit is a colour, not a product.
 */
export type Card = {
  key: string;
  href: string;
  name: string;
  categorySlug: string;
  colourName: string;
  priceKobo: number;
  image: SanityImage | undefined;
  soldOut: boolean;
};

export function unitsInStock(colourway: Pick<Colourway, "stock">): number {
  return (colourway.stock ?? []).reduce((total, row) => total + (row.quantity ?? 0), 0);
}

export function toCards(products: Product[]): Card[] {
  return products.flatMap((product) =>
    (product.colourways ?? []).map((colourway) => ({
      key: `${product.slug}-${colourway.slug}`,
      href: `/product/${product.slug}?colour=${colourway.slug}`,
      name: product.name,
      categorySlug: product.category?.slug ?? "",
      colourName: colourway.name,
      priceKobo: product.priceKobo,
      image: colourway.images?.[0],
      soldOut: unitsInStock(colourway) === 0,
    })),
  );
}
