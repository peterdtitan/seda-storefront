import Link from "next/link";

import { SanityImage } from "@/components/SanityImage";
import { UiLabel } from "@/components/ui/Text";
import type { Card } from "@/lib/catalogue";
import { formatNaira } from "@/lib/money";

import s from "./ProductCard.module.css";

type Props = {
  card: Card;
  height: string;
  sizes: string;
  priority?: boolean;
  /** Shop and "pairs with" split colour and price onto their own lines. */
  layout?: "inline" | "stacked";
};

export function ProductCard({ card, height, sizes, priority, layout = "inline" }: Props) {
  return (
    <Link
      href={card.href}
      className={[s.card, layout === "stacked" ? s.compact : ""].filter(Boolean).join(" ")}
    >
      <div className={s.frame} style={{ height }}>
        <SanityImage image={card.image} sizes={sizes} fill priority={priority} />
        {card.soldOut && (
          <UiLabel className={s.badge} colour="var(--text-muted)">
            Sold out
          </UiLabel>
        )}
      </div>

      <div className={s.name}>{card.name}</div>

      {layout === "inline" ? (
        <div className={s.meta}>
          {card.colourName} · {formatNaira(card.priceKobo)}
        </div>
      ) : (
        <>
          <div className={s.meta}>{card.colourName}</div>
          <div className={s.price}>{card.soldOut ? "—" : formatNaira(card.priceKobo)}</div>
        </>
      )}
    </Link>
  );
}
