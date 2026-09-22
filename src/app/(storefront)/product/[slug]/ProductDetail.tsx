"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SanityImage } from "@/components/SanityImage";
import { Cta } from "@/components/ui/Button";
import { Sizes } from "@/components/ui/Sizes";
import { Swatches } from "@/components/ui/Swatches";
import { BrandBody, Display, UiLabel } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { Colourway, Product } from "@/lib/catalogue";
import { unitsInStock } from "@/lib/catalogue";
import { formatNaira } from "@/lib/money";

import s from "./product.module.css";

const SIZE_ORDER = ["S", "M", "L", "XL"];

/** Below this, the design shows the amber stock notice. */
const LOW_STOCK_THRESHOLD = 5;

const TABS = ["details", "care", "shipping"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  details: "Details",
  care: "Care",
  shipping: "Shipping",
};

function stockFor(colourway: Colourway | undefined, size: string | undefined) {
  if (!colourway || !size) return 0;
  return colourway.stock?.find((row) => row.size === size)?.quantity ?? 0;
}

export function ProductDetail({
  product,
  shippingCopy,
  initialColour,
}: {
  product: Product & {
    description: string;
    details: string;
    care: string;
    shipping?: string;
    research?: string;
  };
  shippingCopy: string;
  initialColour: string;
}) {
  const router = useRouter();
  const [colourSlug, setColourSlug] = useState(initialColour);
  const [tab, setTab] = useState<Tab>("details");
  const [quantity, setQuantity] = useState(1);

  const colourway = useMemo(
    () => product.colourways.find((c) => c.slug === colourSlug) ?? product.colourways[0],
    [product.colourways, colourSlug],
  );

  const sizes = useMemo(
    () =>
      SIZE_ORDER.map((size) => ({
        size,
        soldOut: stockFor(colourway, size) === 0,
      })),
    [colourway],
  );

  const [size, setSize] = useState<string | undefined>(
    () => SIZE_ORDER.find((candidate) => stockFor(colourway, candidate) > 0) ?? undefined,
  );

  const available = stockFor(colourway, size);
  const colourSoldOut = unitsInStock(colourway) === 0;
  const maxQuantity = Math.max(1, Math.min(available, 10));

  function chooseColour(next: string) {
    const nextColourway = product.colourways.find((c) => c.slug === next);
    setColourSlug(next);

    // Keeping a size that is sold out in the new colour would let someone add an
    // unavailable combination, so fall back to the first size that exists.
    const keep = size && stockFor(nextColourway, size) > 0;
    if (!keep) {
      setSize(SIZE_ORDER.find((candidate) => stockFor(nextColourway, candidate) > 0));
    }
    setQuantity(1);

    router.replace(`/product/${product.slug}?colour=${next}`, { scroll: false });
    track(EVENTS.colourwaySelected, {
      productId: product._id,
      productSlug: product.slug,
      productName: product.name,
      colourway: nextColourway?.name,
    });
  }

  function chooseSize(next: string) {
    setSize(next);
    setQuantity(1);
    track(EVENTS.sizeSelected, {
      productId: product._id,
      productSlug: product.slug,
      productName: product.name,
      colourway: colourway?.name,
      size: next,
    });
  }

  function addToBag() {
    track(EVENTS.addedToBag, {
      productId: product._id,
      productSlug: product.slug,
      productName: product.name,
      colourway: colourway?.name,
      size,
      quantity,
      valueKobo: product.priceKobo * quantity,
    });
    router.push("/bag");
  }

  const images = colourway?.images ?? [];
  const tabCopy: Record<Tab, string> = {
    details: product.details,
    care: product.care,
    shipping: product.shipping || shippingCopy,
  };

  return (
    <>
      <div className={s.columns}>
        <div className={s.gallery}>
          {images[0] && (
            <div className={[s.hero, images.length < 2 ? s.heroAlone : ""].join(" ")}>
              <SanityImage image={images[0]} sizes="(max-width: 768px) 100vw, 45vw" fill priority />
            </div>
          )}
          {images.slice(1, 3).map((image, i) => (
            <div key={image.asset?._id ?? i} className={s.secondary}>
              <SanityImage image={image} sizes="(max-width: 768px) 100vw, 22vw" fill />
            </div>
          ))}
        </div>

        <div className={s.detail}>
          <Display as="h1" className={s.title}>
            {product.name}
          </Display>
          <div className={`${s.price} seda-tabular`}>{formatNaira(product.priceKobo)}</div>
          <BrandBody max="42ch" className={s.rationale}>
            {product.description}
          </BrandBody>

          <div className={s.field}>
            <UiLabel className={s.fieldLabel}>Colour — {colourway?.name}</UiLabel>
            <Swatches
              options={product.colourways.map((c) => ({
                name: c.name,
                slug: c.slug,
                swatch: c.swatch,
                soldOut: unitsInStock(c) === 0,
              }))}
              value={colourSlug}
              onChange={chooseColour}
              disableSoldOut={false}
            />
          </div>

          <div className={s.sizeField}>
            <UiLabel className={s.fieldLabel}>Size</UiLabel>
            <Sizes options={sizes} value={size} onChange={chooseSize} />
          </div>

          <div className={s.buy}>
            <div className={s.stepper}>
              <button
                type="button"
                className={s.stepperButton}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className={s.stepperValue} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className={s.stepperButton}
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <Cta full className={s.addToBag} onClick={addToBag} disabled={!size || available === 0}>
              {colourSoldOut ? "Sold out" : "Add to bag"}
            </Cta>
          </div>

          {colourSoldOut ? (
            <div className={`${s.notice} ${s.soldOutNotice}`}>
              {colourway?.name} is sold out. Try another colour.
            </div>
          ) : (
            available > 0 &&
            available < LOW_STOCK_THRESHOLD && (
              <div className={s.notice}>
                Only {available} left in {colourway?.name}, {size}.
              </div>
            )
          )}

          <div className={s.tabs} role="tablist">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                id={`tab-${name}`}
                aria-selected={tab === name}
                aria-controls={`panel-${name}`}
                onClick={() => setTab(name)}
                className={[s.tab, tab === name ? s.tabActive : ""].filter(Boolean).join(" ")}
              >
                {TAB_LABELS[name]}
              </button>
            ))}
          </div>
          <div
            className={s.tabPanel}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tabCopy[tab]}
          </div>
        </div>
      </div>
    </>
  );
}
