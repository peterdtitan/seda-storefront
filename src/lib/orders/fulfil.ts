import "server-only";

import { EVENTS } from "@/lib/analytics/events";
import { recordEvents } from "@/lib/analytics/record";

import {
  claimStockAdjustment,
  noteStockIssue,
  orderAttribution,
  orderLines,
  releaseStockAdjustment,
} from "./store";
import { decrementStock } from "./stock";

/**
 * Everything that happens once, after an order is known to be paid.
 *
 * Called from both the webhook and the callback page, because either can be the first
 * to learn about a payment and neither is guaranteed to arrive. The two halves are
 * claimed separately on purpose: a payment that cannot be taken out of stock is still
 * a payment, and should still count as one.
 */
export async function fulfilOrder(input: {
  reference: string;
  totalKobo: number;
  /** True only on the pending -> paid transition, so the event is recorded once. */
  firstTransition: boolean;
}) {
  const { reference, totalKobo, firstTransition } = input;
  const lines = await orderLines(reference);

  if (firstTransition) {
    // Recorded server side rather than from the browser: this is the event that
    // decides the conversion rate, and it should not depend on the shopper's tab
    // staying open or an ad blocker staying out of the way. The ids come off the
    // order so it joins the session that browsed rather than inventing a new one.
    const who = await orderAttribution(reference);

    await recordEvents([
      {
        name: EVENTS.paymentSucceeded,
        visitorId: who.visitorId ?? `order:${reference}`,
        sessionId: who.sessionId ?? `order:${reference}`,
        valueKobo: totalKobo,
        quantity: lines.reduce((total, line) => total + line.quantity, 0),
        props: {
          reference,
          lines: lines.length,
          items: lines.map((l) => `${l.product_name} / ${l.size} x${l.quantity}`),
        },
      },
    ]);
  }

  await adjustStock(reference, lines);
}

async function adjustStock(reference: string, lines: Awaited<ReturnType<typeof orderLines>>) {
  const claimed = await claimStockAdjustment(reference);
  if (!claimed) return;

  try {
    const { oversold } = await decrementStock(
      lines.map((line) => ({
        productSlug: line.product_slug,
        colourSlug: line.colour_slug,
        size: line.size,
        quantity: line.quantity,
      })),
    );

    // Stock is clamped at zero, so the sale still goes through and the count stays
    // sane. Someone still has to be told a piece was sold twice.
    if (oversold.length) {
      console.error("[orders] oversold", { reference, oversold });
      await noteStockIssue(reference, `Oversold: ${oversold.join("; ")}`);
    }
  } catch (error) {
    // The money is taken and the order stands. Give the claim back, record why, and
    // let the admin see a paid order whose stock never moved.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[orders] stock adjustment failed", { reference, message });
    await releaseStockAdjustment(reference, message);
  }
}
