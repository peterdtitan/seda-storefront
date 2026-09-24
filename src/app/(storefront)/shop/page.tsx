import type { Metadata } from "next";

import { SanityImage } from "@/components/SanityImage";
import { Track } from "@/components/Track";
import { Cta, Outline } from "@/components/ui/Button";
import { Scrim } from "@/components/ui/Scrim";
import { StateMessage } from "@/components/ui/StateMessage";
import { STUDIO } from "@/lib/studio";
import { Display, Eyebrow } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { toCards, type Product } from "@/lib/catalogue";
import { sanityFetch } from "@/sanity/lib/client";
import { SHOP_QUERY } from "@/sanity/lib/queries";
import type { SanityImage as SanityImageValue } from "@/sanity/lib/types";

import { ShopGrid, type Category } from "./ShopGrid";
import s from "./shop.module.css";

export const metadata: Metadata = {
  title: "Shop — Șèdá",
  description: "Contemporary Adire for everyday life. Drop 01, made in Lagos.",
};

type ShopData = {
  copy: { shopEyebrow: string; shopBannerImage: SanityImageValue } | null;
  categories: Category[] | null;
  products: Product[] | null;
};

type SearchParams = Promise<{ category?: string; sort?: string }>;

const SORTS = new Set(["newest", "price-asc", "price-desc"]);

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const [data, params] = await Promise.all([sanityFetch<ShopData>(SHOP_QUERY), searchParams]);

  const categories = data?.categories ?? [];
  const cards = toCards(data?.products ?? []);

  const requested = params.category?.toLowerCase() ?? "all";
  const category = categories.some((c) => c.slug === requested) ? requested : "all";
  const sort = SORTS.has(params.sort ?? "") ? params.sort! : "newest";
  const results =
    category === "all" ? cards.length : cards.filter((c) => c.categorySlug === category).length;

  return (
    <>
      <Track
        event={EVENTS.productListViewed}
        dedupe={`${category}:${sort}`}
        props={{ category, sort, results }}
      />

      <section className={s.banner}>
        <SanityImage image={data?.copy?.shopBannerImage} sizes="100vw" fill priority alt="" />
        <Scrim dir="left" />
        <div className={s.bannerCopy}>
          <Eyebrow colour="var(--seda-cream)">{data?.copy?.shopEyebrow}</Eyebrow>
          <Display as="h1" colour="var(--seda-cream)" className={s.bannerTitle}>
            Shop
          </Display>
        </div>
      </section>

      <div className={s.body}>
        {/* null means the CMS did not answer; an empty array means it answered and the
            drop really is empty. Collapsing the two told the visitor the category was
            empty when in fact nothing had loaded. */}
        {data === null ? (
          <StateMessage
            eyebrow="Catalogue unavailable"
            tone="fault"
            title="We cannot reach the collection right now"
            body={
              <>
                The pieces are still here — our catalogue just is not answering. Try again in a
                moment, or write to <a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a> and we
                will take your order directly.
              </>
            }
          >
            <Cta href="/shop">Try again</Cta>
            <Outline href="/contact">Get in touch</Outline>
          </StateMessage>
        ) : (
          <ShopGrid
            cards={cards}
            categories={categories}
            initialCategory={category}
            initialSort={sort as "newest" | "price-asc" | "price-desc"}
          />
        )}
      </div>
    </>
  );
}
