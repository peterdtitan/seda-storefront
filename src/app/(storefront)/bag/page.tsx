import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Track } from "@/components/Track";
import { Display } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { CART_COOKIE, cartCount, parseCart } from "@/lib/cart/types";
import type { Product } from "@/lib/catalogue";
import { sanityFetch } from "@/sanity/lib/client";
import { BAG_QUERY } from "@/sanity/lib/queries";

import { BagContents } from "./BagContents";
import s from "./bag.module.css";

export const metadata: Metadata = {
  title: "Your bag — Șèdá",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BagPage() {
  const jar = await cookies();
  const cart = parseCart(jar.get(CART_COOKIE)?.value);

  // The cookie holds identifiers; every price and name comes from the CMS here, so a
  // hand-edited cookie cannot change a total.
  const slugs = [...new Set(cart.map((line) => line.productSlug))];
  const products = slugs.length ? await sanityFetch<Product[]>(BAG_QUERY, { slugs }) : [];

  return (
    <div className={s.page}>
      <Track event={EVENTS.bagViewed} quantity={cartCount(cart)} props={{ lines: cart.length }} />

      <Display as="h1" className={s.title}>
        Your bag
      </Display>

      <BagContents products={products ?? []} />
    </div>
  );
}
