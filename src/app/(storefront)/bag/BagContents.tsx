"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import { SanityImage } from "@/components/SanityImage";
import { Cta } from "@/components/ui/Button";
import { Rule } from "@/components/ui/Rule";
import { BrandBody, Display, Eyebrow } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { useCart } from "@/lib/cart/CartProvider";
import { lineKey } from "@/lib/cart/types";
import type { Colourway, Product } from "@/lib/catalogue";
import { formatNaira } from "@/lib/money";

import s from "./bag.module.css";

type Resolved = {
  key: string;
  product: Product;
  colourway: Colourway;
  size: string;
  quantity: number;
  available: number;
  lineTotalKobo: number;
};

export function BagContents({ products }: { products: Product[] }) {
  const { cart, setQuantity, remove, announce } = useCart();
  const removeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const continueRef = useRef<HTMLAnchorElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  // Removing a line unmounts the button that had focus, which drops the keyboard
  // back to the top of the document. A ref rather than state: this is a note to the
  // effect about what to do once the list re-renders, not something we render from.
  const pendingFocus = useRef<number | null>(null);

  const lines = useMemo<Resolved[]>(
    () =>
      cart.flatMap((line) => {
        const product = products.find((p) => p.slug === line.productSlug);
        const colourway = product?.colourways?.find((c) => c.slug === line.colourSlug);
        // A product pulled from the shop, or a colourway retired, leaves a cookie line
        // with nothing behind it. Drop it rather than rendering a blank row.
        if (!product || !colourway) return [];

        const available = colourway.stock?.find((r) => r.size === line.size)?.quantity ?? 0;

        return [
          {
            key: lineKey(line),
            product,
            colourway,
            size: line.size,
            quantity: line.quantity,
            available,
            lineTotalKobo: product.priceKobo * line.quantity,
          },
        ];
      }),
    [cart, products],
  );

  // A line the CMS no longer resolves leaves the header counting something the bag
  // does not show, so prune it from the cookie rather than letting the two disagree.
  const stale = useMemo(
    () => cart.filter((line) => !lines.some((resolved) => resolved.key === lineKey(line))),
    [cart, lines],
  );

  useEffect(() => {
    stale.forEach((line) => remove(lineKey(line)));
  }, [stale, remove]);

  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const buttons = removeRefs.current.filter(Boolean);
    // Removing the last line unmounts every one of those, so the empty state is
    // the last resort — otherwise focus falls to the top of the document.
    (
      buttons[Math.min(index, buttons.length - 1)] ??
      continueRef.current ??
      emptyRef.current
    )?.focus();
  }, [lines.length]);

  const subtotalKobo = lines.reduce((total, line) => total + line.lineTotalKobo, 0);
  const overstocked = lines.some((line) => line.quantity > line.available);

  if (lines.length === 0) {
    return (
      <div className={s.empty} ref={emptyRef} tabIndex={-1}>
        <Display as="p" className={s.emptyTitle}>
          Your bag is empty
        </Display>
        <BrandBody max="40ch" className={s.emptyBody}>
          Drop 01 is small and made in short runs. Have a look at what is still here.
        </BrandBody>
        <Cta href="/shop">Shop the drop</Cta>
      </div>
    );
  }

  return (
    <div className={s.columns}>
      <div>
        {lines.map((line, index) => (
          <div key={line.key} className={s.line}>
            <div className={s.thumb}>
              <SanityImage image={line.colourway.images?.[0]} sizes="110px" fill alt="" />
            </div>

            <div className={s.lineBody}>
              <Link
                href={`/product/${line.product.slug}?colour=${line.colourway.slug}`}
                className={s.lineName}
              >
                {line.product.name}
              </Link>
              <div className={s.lineMeta}>
                {line.colourway.name} · Size {line.size}
              </div>

              <div className={s.lineControls}>
                <div className={s.stepper}>
                  <button
                    type="button"
                    className={s.stepperButton}
                    onClick={() => {
                      setQuantity(line.key, line.quantity - 1);
                      announce(`${line.product.name}, quantity ${line.quantity - 1}.`);
                    }}
                    aria-label={`Decrease quantity of ${line.product.name}`}
                  >
                    −
                  </button>
                  <span className={s.stepperValue}>{line.quantity}</span>
                  <button
                    type="button"
                    className={s.stepperButton}
                    onClick={() => {
                      setQuantity(line.key, line.quantity + 1);
                      announce(`${line.product.name}, quantity ${line.quantity + 1}.`);
                    }}
                    disabled={line.quantity >= line.available}
                    aria-label={`Increase quantity of ${line.product.name}`}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  ref={(node) => {
                    removeRefs.current[index] = node;
                  }}
                  className={s.remove}
                  aria-label={`Remove ${line.product.name}, ${line.colourway.name}, size ${line.size}`}
                  onClick={() => {
                    remove(line.key);
                    announce(`${line.product.name} removed from your bag.`);
                    pendingFocus.current = index;
                    track(EVENTS.removedFromBag, {
                      productSlug: line.product.slug,
                      productName: line.product.name,
                      colourway: line.colourway.name,
                      size: line.size,
                      quantity: line.quantity,
                      valueKobo: line.lineTotalKobo,
                    });
                  }}
                >
                  Remove
                </button>
              </div>

              {line.quantity > line.available && (
                <div className={s.lineNotice} role="status">
                  {line.available === 0
                    ? "Sold out since you added it. Remove to continue."
                    : `Only ${line.available} left. Reduce the quantity to continue.`}
                </div>
              )}
            </div>

            <div className={s.linePrice}>{formatNaira(line.lineTotalKobo)}</div>
          </div>
        ))}

        <div className={s.continue}>
          <Link href="/shop" ref={continueRef} className={s.continueLink}>
            Continue shopping
          </Link>
        </div>
      </div>

      <aside className={s.summary} aria-labelledby="bag-summary">
        <Eyebrow as="h2" id="bag-summary">
          Summary
        </Eyebrow>

        <div className={s.summaryRow}>
          <span>Subtotal</span>
          <span className="seda-tabular">{formatNaira(subtotalKobo)}</span>
        </div>
        <div className={s.summaryRow}>
          <span>Delivery</span>
          <span>Free — Lagos</span>
        </div>
        <div className={s.summaryRow}>
          <span>Duties</span>
          <span>Calculated at checkout</span>
        </div>

        <Rule style={{ margin: "20px 0" }} />

        <div className={s.totalRow}>
          <span>Total</span>
          <span className="seda-tabular">{formatNaira(subtotalKobo)}</span>
        </div>

        {/* A disabled link is not a thing, so an overstocked bag keeps the button
            form: it stays visible and unclickable rather than silently becoming a
            dead link to a page that would reject it anyway. */}
        {overstocked ? (
          <Cta full className={s.checkout} disabled>
            Checkout
          </Cta>
        ) : (
          <Cta
            full
            href="/checkout"
            className={s.checkout}
            onClick={() =>
              track(EVENTS.checkoutStarted, {
                quantity: lines.reduce((t, l) => t + l.quantity, 0),
                valueKobo: subtotalKobo,
                props: { lines: lines.length },
              })
            }
          >
            Checkout
          </Cta>
        )}

        <p className={s.payNote}>Paystack · Bank transfer · Pay on delivery in Lagos</p>
      </aside>
    </div>
  );
}
