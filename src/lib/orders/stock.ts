import "server-only";

import { canWriteToSanity, writeClient } from "@/sanity/lib/writeClient";

export type StockChange = {
  productSlug: string;
  colourSlug: string;
  size: string;
  quantity: number;
};

type ProductShape = {
  _id: string;
  _rev: string;
  colourways?: { slug?: { current?: string }; stock?: { size?: string; quantity?: number }[] }[];
};

const QUERY = `*[_type == "product" && slug.current == $slug][0]{
  _id, _rev, colourways[]{ slug, stock[]{ size, quantity } }
}`;

/**
 * Takes sold units out of the CMS.
 *
 * Patched by array index rather than by _key, because an order line records the
 * colour's slug and the size, and neither is the key. The index is only valid for
 * the revision it was read from, so every patch is guarded by ifRevisionId: if an
 * editor reorders colourways in the Studio between the read and the write, the patch
 * is rejected rather than decrementing the wrong colour.
 */
export type StockResult = { oversold: string[] };

export async function decrementStock(changes: StockChange[]): Promise<StockResult> {
  if (!canWriteToSanity || !writeClient) {
    throw new Error("SANITY_API_WRITE_TOKEN is not set — cannot take sold units out of stock.");
  }

  const bySlug = new Map<string, StockChange[]>();
  for (const change of changes) {
    const list = bySlug.get(change.productSlug) ?? [];
    list.push(change);
    bySlug.set(change.productSlug, list);
  }

  const oversold: string[] = [];
  for (const [slug, lines] of bySlug) {
    oversold.push(...(await patchProduct(slug, lines)));
  }
  return { oversold };
}

async function patchProduct(slug: string, lines: StockChange[], attempt = 0): Promise<string[]> {
  const product = await writeClient!.fetch<ProductShape | null>(QUERY, { slug });
  if (!product) throw new Error(`Cannot adjust stock: no product for slug "${slug}".`);

  // set rather than dec, and clamped at zero. Two shoppers can pass the stock check
  // at the same moment and both pay, and a blind decrement would take the count
  // negative — which reads as "Only -1 left" and breaks the sold-out test. Sanity's
  // min(0) rule is Studio-side and does not apply to an API patch.
  const updates: Record<string, number> = {};
  const oversold: string[] = [];

  for (const line of lines) {
    const colourIndex = (product.colourways ?? []).findIndex(
      (c) => c?.slug?.current === line.colourSlug,
    );
    if (colourIndex < 0) {
      throw new Error(`Cannot adjust stock: "${slug}" has no colourway "${line.colourSlug}".`);
    }

    const stock = product.colourways?.[colourIndex]?.stock ?? [];
    const sizeIndex = stock.findIndex((row) => row?.size === line.size);
    if (sizeIndex < 0) {
      throw new Error(
        `Cannot adjust stock: "${slug}"/"${line.colourSlug}" has no size ${line.size}.`,
      );
    }

    const path = `colourways[${colourIndex}].stock[${sizeIndex}].quantity`;
    const current = updates[path] ?? stock[sizeIndex]?.quantity ?? 0;
    const next = current - line.quantity;

    if (next < 0) {
      oversold.push(`${slug}/${line.colourSlug}/${line.size} by ${-next}`);
    }
    updates[path] = Math.max(0, next);
  }

  try {
    await writeClient!
      .patch(product._id)
      .ifRevisionId(product._rev)
      .set(updates)
      .commit({ autoGenerateArrayKeys: false });
    return oversold;
  } catch (error) {
    // A revision mismatch means someone edited the product between the read and the
    // write. Re-read and try again rather than forcing a patch built on stale indices.
    const mismatch =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode === 409
        : false;

    if (mismatch && attempt < 3) return patchProduct(slug, lines, attempt + 1);
    throw error;
  }
}
