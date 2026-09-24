import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Cta } from "@/components/ui/Button";
import { Rule } from "@/components/ui/Rule";
import { StateMessage } from "@/components/ui/StateMessage";
import { Display, Eyebrow } from "@/components/ui/Text";
import { CART_COOKIE, parseCart } from "@/lib/cart/types";
import { formatNaira } from "@/lib/money";
import { priceCart } from "@/lib/orders/price";

import { CheckoutForm } from "./CheckoutForm";
import s from "./checkout.module.css";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const jar = await cookies();
  const priced = await priceCart(parseCart(jar.get(CART_COOKIE)?.value));

  if (!priced.ok) {
    return (
      <StateMessage
        as="h1"
        eyebrow="Checkout"
        tone={priced.reason === "empty" ? "quiet" : "fault"}
        title={priced.reason === "empty" ? "Your bag is empty" : "We cannot check you out yet"}
        body={priced.message}
      >
        <Cta href="/shop">Shop the drop</Cta>
      </StateMessage>
    );
  }

  return (
    <div className={s.page}>
      <Display as="h1" className={s.title}>
        Checkout
      </Display>

      <div className={s.columns}>
        <CheckoutForm total={formatNaira(priced.totalKobo)} />

        <aside className={s.summary} aria-labelledby="checkout-summary">
          <Eyebrow as="h2" id="checkout-summary">
            Your order
          </Eyebrow>

          {priced.lines.map((line) => (
            <div key={`${line.productSlug}-${line.colourSlug}-${line.size}`} className={s.line}>
              <div>
                <div className={s.lineName}>{line.productName}</div>
                <div className={s.lineMeta}>
                  {line.colourName} · {line.size} · ×{line.quantity}
                </div>
              </div>
              <span className="seda-tabular">{formatNaira(line.lineKobo)}</span>
            </div>
          ))}

          <Rule style={{ margin: "20px 0" }} />

          <div className={s.row}>
            <span>Subtotal</span>
            <span className="seda-tabular">{formatNaira(priced.subtotalKobo)}</span>
          </div>
          <div className={s.row}>
            <span>Delivery</span>
            <span>
              {priced.deliveryKobo === 0 ? "Free — Lagos" : formatNaira(priced.deliveryKobo)}
            </span>
          </div>

          <Rule style={{ margin: "20px 0" }} />

          <div className={s.total}>
            <span>Total</span>
            <span className="seda-tabular">{formatNaira(priced.totalKobo)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
