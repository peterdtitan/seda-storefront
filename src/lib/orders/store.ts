import "server-only";

import { randomBytes } from "node:crypto";

import { requireSql } from "@/lib/db";

import type { PricedLine } from "./price";

export type Customer = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
};

/** Paystack references must be unique per integration and are visible to the
 * customer, so this is readable but not guessable or sequential — a sequential one
 * would let anyone enumerate other people's orders on the callback URL. */
export function newReference(): string {
  return `seda_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

export type Attribution = { visitorId: string | null; sessionId: string | null };

export async function createPendingOrder(input: {
  reference: string;
  customer: Customer;
  lines: PricedLine[];
  attribution?: Attribution;
  subtotalKobo: number;
  deliveryKobo: number;
  totalKobo: number;
}) {
  const sql = requireSql();

  // One transaction: an order with no items is worse than no order at all.
  await sql.begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      insert into orders (
        reference, status, subtotal_kobo, delivery_kobo, total_kobo,
        email, name, phone, address, city, state, visitor_id, session_id
      ) values (
        ${input.reference}, 'pending', ${input.subtotalKobo}, ${input.deliveryKobo},
        ${input.totalKobo}, ${input.customer.email}, ${input.customer.name},
        ${input.customer.phone ?? null}, ${input.customer.address ?? null},
        ${input.customer.city ?? null}, ${input.customer.state ?? null},
        ${input.attribution?.visitorId ?? null}, ${input.attribution?.sessionId ?? null}
      )
      returning id
    `;

    await tx`
      insert into order_items ${tx(
        input.lines.map((line) => ({
          order_id: order.id,
          product_slug: line.productSlug,
          product_name: line.productName,
          colour_slug: line.colourSlug,
          colour_name: line.colourName,
          size: line.size,
          quantity: line.quantity,
          unit_kobo: line.unitKobo,
          line_kobo: line.lineKobo,
        })),
      )}
    `;
  });
}

export type OrderRow = {
  reference: string;
  status: string;
  total_kobo: string;
  email: string;
  name: string;
  paid_at: string | null;
};

export async function findOrder(reference: string): Promise<OrderRow | null> {
  const sql = requireSql();
  const [row] = await sql<OrderRow[]>`
    select reference, status, total_kobo, email, name, paid_at
    from orders where reference = ${reference}
  `;
  return row ?? null;
}

/** Marks an order paid, but only from pending.
 *
 * The where clause is the guard: Paystack retries webhooks, and the callback page
 * verifies independently, so this runs more than once per order by design. Restricting
 * it to pending makes the second run a no-op instead of a second fulfilment. */
export async function markPaid(input: {
  reference: string;
  amountKobo: number;
  paystackStatus: string;
  paidAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  raw: unknown;
}): Promise<"paid" | "already" | "mismatch" | "missing"> {
  const sql = requireSql();

  const [order] = await sql<{ status: string; total_kobo: string }[]>`
    select status, total_kobo from orders where reference = ${input.reference}
  `;
  if (!order) return "missing";
  if (order.status === "paid") return "already";

  // If the amount paid is not the amount we asked for, do not fulfil. This is the
  // check that catches a tampered initialise call or a mis-keyed manual payment.
  if (BigInt(order.total_kobo) !== BigInt(input.amountKobo)) {
    console.error("[paystack] amount mismatch", {
      reference: input.reference,
      expected: order.total_kobo,
      got: input.amountKobo,
    });
    return "mismatch";
  }

  await sql`
    update orders set
      status = 'paid',
      paystack_status = ${input.paystackStatus},
      paid_at = ${input.paidAt ? new Date(input.paidAt) : new Date()},
      channel = ${input.channel},
      gateway_response = ${input.gatewayResponse},
      raw_event = ${sql.json(input.raw as never)}
    where reference = ${input.reference} and status = 'pending'
  `;

  return "paid";
}

export async function markFailed(reference: string, gatewayResponse: string | null) {
  const sql = requireSql();
  await sql`
    update orders set status = 'failed', gateway_response = ${gatewayResponse}
    where reference = ${reference} and status = 'pending'
  `;
}

/** Records the event and reports whether this is the first time we have seen it.
 * The unique constraint on event_id is what makes a Paystack retry harmless. */
export async function recordEventOnce(input: {
  eventId: string;
  eventType: string;
  reference: string | null;
  payload: unknown;
}): Promise<boolean> {
  const sql = requireSql();
  const rows = await sql<{ id: string }[]>`
    insert into paystack_events (event_id, event_type, reference, payload)
    values (${input.eventId}, ${input.eventType}, ${input.reference},
            ${sql.json(input.payload as never)})
    on conflict (event_id) do nothing
    returning id
  `;
  return rows.length > 0;
}

/** The session that placed the order, for the events recorded once it is paid.
 * Null for an order placed before attribution existed, or with storage blocked. */
export async function orderAttribution(reference: string): Promise<Attribution> {
  const sql = requireSql();
  const [row] = await sql<{ visitor_id: string | null; session_id: string | null }[]>`
    select visitor_id, session_id from orders where reference = ${reference}
  `;
  return { visitorId: row?.visitor_id ?? null, sessionId: row?.session_id ?? null };
}

export type OrderLine = {
  product_slug: string;
  colour_slug: string;
  size: string;
  quantity: number;
  product_name: string;
  line_kobo: string;
};

export async function orderLines(reference: string): Promise<OrderLine[]> {
  const sql = requireSql();
  return sql<OrderLine[]>`
    select i.product_slug, i.colour_slug, i.size, i.quantity, i.product_name, i.line_kobo
    from order_items i
    join orders o on o.id = i.order_id
    where o.reference = ${reference}
  `;
}

/** Claims the right to adjust stock for this order, once.
 *
 * The webhook and the callback page both reach fulfilment, and Paystack retries, so
 * this runs concurrently by design. The update only matches a paid order whose stock
 * has not been claimed, so exactly one caller gets a row back and the rest get none. */
export async function claimStockAdjustment(reference: string): Promise<boolean> {
  const sql = requireSql();
  const rows = await sql<{ id: string }[]>`
    update orders set stock_adjusted_at = now(), stock_error = null
    where reference = ${reference} and status = 'paid' and stock_adjusted_at is null
    returning id
  `;
  return rows.length > 0;
}

/** Hands the claim back so a later attempt can retry, and leaves the reason on the
 * order so an unfulfilled sale is visible rather than silent. */
export async function releaseStockAdjustment(reference: string, message: string) {
  const sql = requireSql();
  await sql`
    update orders set stock_adjusted_at = null, stock_error = ${message.slice(0, 500)}
    where reference = ${reference}
  `;
}

/** Records a problem without giving the claim back. Used when stock was adjusted but
 * something about it needs a human — an oversell, say. Releasing the claim here would
 * let the next webhook decrement the same order a second time. */
export async function noteStockIssue(reference: string, message: string) {
  const sql = requireSql();
  await sql`
    update orders set stock_error = ${message.slice(0, 500)}
    where reference = ${reference}
  `;
}
