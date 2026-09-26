/** The vocabulary of both state machines.
 *
 * Deliberately free of server imports. The filter bar is a client component and needs
 * these lists; when they lived beside the queries, importing them dragged src/lib/db
 * and the Postgres driver into the browser bundle.
 */

export const PAYMENT_STATUSES = ["paid", "pending", "failed", "abandoned", "refunded"] as const;

export const FULFILMENT_STATUSES = [
  "unfulfilled",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number];

export const FULFILMENT_LABEL: Record<string, string> = {
  unfulfilled: "Unfulfilled",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
