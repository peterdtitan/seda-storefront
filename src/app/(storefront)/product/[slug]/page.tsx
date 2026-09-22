import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/ProductCard";
import { Track } from "@/components/Track";
import { BrandBody, Display, Eyebrow, UiLabel } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { toCards, type Colourway, type Product } from "@/lib/catalogue";
import { sanityFetch } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";

import { ProductDetail } from "./ProductDetail";
import s from "./product.module.css";

type FullProduct = Product & {
  description: string;
  details: string;
  care: string;
  shipping?: string;
  research?: string;
  colourways: Colourway[];
  pairsWith?: Product[];
};

type ProductData = {
  product: FullProduct | null;
  fallbackPairs: Product[] | null;
  shippingCopy: string | null;
};

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ colour?: string }>;

async function load(slug: string) {
  return sanityFetch<ProductData>(PRODUCT_QUERY, { slug });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  const product = data?.product;
  if (!product) return { title: "Not found — Șèdá" };

  return {
    title: `${product.name} — Șèdá`,
    description: product.description?.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await load(slug);
  const product = data?.product;

  if (!product) notFound();

  const colourways = product.colourways ?? [];
  const requested = query.colour?.toLowerCase();
  const colourway = colourways.find((c) => c.slug === requested) ?? colourways[0];

  const pairs = toCards(
    (product.pairsWith?.length ? product.pairsWith : (data?.fallbackPairs ?? [])).slice(0, 4),
  )
    // One card per product here, not per colourway: four garments, not four colours
    // of the same garment.
    .filter((card, i, all) => all.findIndex((c) => c.name === card.name) === i)
    .slice(0, 4);

  return (
    <>
      <Track
        event={EVENTS.productViewed}
        productId={product._id}
        productSlug={product.slug}
        productName={product.name}
        colourway={colourway?.name}
        valueKobo={product.priceKobo}
      />

      <div className={s.page}>
        <UiLabel as="nav" colour="var(--text-muted)" className={s.breadcrumb}>
          <Link href="/shop">Shop</Link>
          {product.category && (
            <>
              {" / "}
              <Link href={`/shop?category=${product.category.slug}`}>{product.category.title}</Link>
            </>
          )}
          {" / "}
          {product.name}
        </UiLabel>

        <ProductDetail
          product={product}
          shippingCopy={data?.shippingCopy ?? ""}
          initialColour={colourway?.slug ?? ""}
        />
      </div>

      {product.research && (
        <section className={s.research} data-theme="oxblood">
          <Eyebrow colour="var(--text-on-inverse-muted)">Research insights</Eyebrow>
          <BrandBody colour="var(--seda-cream)" max="52ch" size="20px" className={s.researchBody}>
            {product.research}
          </BrandBody>
        </section>
      )}

      {pairs.length > 0 && (
        <section className={s.pairs}>
          <Display as="h2" className={s.pairsTitle}>
            Pairs with
          </Display>
          <div className={s.pairsGrid}>
            {pairs.map((card) => (
              <ProductCard
                key={card.key}
                card={card}
                height="260px"
                sizes="(max-width: 768px) 50vw, 25vw"
                layout="minimal"
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
