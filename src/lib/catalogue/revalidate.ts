import "server-only";

import { revalidatePath } from "next/cache";

/**
 * The shop's own caches, busted after an edit.
 *
 * Without this the owner saves a price, looks at the shop and sees the old one — which
 * reads as the editor being broken. Studio has the same lag today and it is the single
 * most confusing thing about editing this site.
 *
 * Sanity's API CDN purges on mutation, so the fetch behind the revalidated route comes
 * back fresh. There is still a second or two where an already-rendered page in
 * somebody's browser disagrees; that is what a reload is for.
 */

const ALWAYS = ["/", "/shop", "/lookbook"];

export function afterProductChange(slug?: string | null) {
  for (const path of ALWAYS) revalidatePath(path);
  revalidatePath("/bag");
  if (slug) revalidatePath(`/product/${slug}`);
}

export function afterLookChange() {
  revalidatePath("/");
  revalidatePath("/lookbook");
}

export function afterCategoryChange() {
  revalidatePath("/shop");
}

/** The announcement bar and the footer tagline are in the storefront layout, so a copy
 * change touches every page rather than one. */
export function afterCopyChange() {
  revalidatePath("/", "layout");
}
