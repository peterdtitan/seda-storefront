"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { Cta } from "@/components/ui/Button";
import { BrandBody, Display, UiLabel } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { Card } from "@/lib/catalogue";

import s from "./shop.module.css";

export type Category = { _id: string; title: string; slug: string };

const SORTS = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;

type Sort = keyof typeof SORTS;

function sortCards(cards: Card[], sort: Sort): Card[] {
  if (sort === "newest") return cards;
  const sorted = [...cards];
  sorted.sort((a, b) =>
    sort === "price-asc" ? a.priceKobo - b.priceKobo : b.priceKobo - a.priceKobo,
  );
  return sorted;
}

export function ShopGrid({
  cards,
  categories,
  initialCategory,
  initialSort,
}: {
  cards: Card[];
  categories: Category[];
  initialCategory: string;
  initialSort: Sort;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<Sort>(initialSort);

  const visible = useMemo(() => {
    const filtered =
      category === "all" ? cards : cards.filter((card) => card.categorySlug === category);
    return sortCards(filtered, sort);
  }, [cards, category, sort]);

  // Filtering stays in local state so it re-renders instantly, as the design requires.
  // The URL is kept in step afterwards so a filtered view is shareable and the footer's
  // /shop?category=bottoms links keep working.
  function syncUrl(nextCategory: string, nextSort: Sort) {
    const params = new URLSearchParams();
    if (nextCategory !== "all") params.set("category", nextCategory);
    if (nextSort !== "newest") params.set("sort", nextSort);
    const query = params.toString();
    router.replace(query ? `/shop?${query}` : "/shop", { scroll: false });
  }

  function chooseCategory(next: string) {
    setCategory(next);
    syncUrl(next, sort);
    track(EVENTS.categoryFiltered, { props: { category: next } });
  }

  function chooseSort(next: Sort) {
    setSort(next);
    syncUrl(category, next);
    track(EVENTS.productListViewed, {
      props: { category, sort: next, results: visible.length },
    });
  }

  return (
    <>
      <div className={s.filters} role="group" aria-label="Filter by category">
        {[{ _id: "all", title: "All", slug: "all" }, ...categories].map((entry) => {
          const active = entry.slug === category;
          return (
            <button
              key={entry._id}
              type="button"
              aria-pressed={active}
              onClick={() => chooseCategory(entry.slug)}
              className={[s.pill, active ? s.pillActive : ""].filter(Boolean).join(" ")}
            >
              {entry.title}
            </button>
          );
        })}
      </div>

      <div className={s.meta}>
        <span className={s.count} role="status">
          {visible.length} {visible.length === 1 ? "piece" : "pieces"}
        </span>
        <div className={s.sort}>
          <label className="seda-visually-hidden" htmlFor="shop-sort">
            Sort products
          </label>
          <UiLabel colour="var(--text-muted)">Sort:</UiLabel>
          <select
            id="shop-sort"
            className={s.sortSelect}
            value={sort}
            onChange={(event) => chooseSort(event.target.value as Sort)}
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={s.empty}>
          <Display as="p" size="26px">
            Nothing in this category yet
          </Display>
          <BrandBody max="42ch" className={s.emptyBody}>
            Drop 01 is small on purpose. Try another category, or see the whole drop.
          </BrandBody>
          <Cta onClick={() => chooseCategory("all")}>See everything</Cta>
        </div>
      ) : (
        <div className={s.grid}>
          {visible.map((card, i) => (
            <ProductCard
              key={card.key}
              card={card}
              height="300px"
              sizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 25vw"
              layout="stacked"
              priority={i < 4}
            />
          ))}
        </div>
      )}
    </>
  );
}
