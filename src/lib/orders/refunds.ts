import "server-only";

import { requireSql, sql } from "@/lib/db";
import { refundTransaction } from "@/lib/paystack/client";

export type RefundRow = {
  id: string;
  reference: string;
  customer: string;
  amountKobo: number;
  orderTotalKobo: number;
  reason: string;
  status: string;
  requestedEmail: string;
  requestedAt: string;
  settledAt: string | null;
  providerStatus: string | null;
  error: string | null;
};

const SELECT = `
  select r.id::text, o.reference, o.name as customer, r.amount_kobo as "amountKobo",
         o.total_kobo as "orderTotalKobo", r.reason, r.status,
         r.requested_email as "requestedEmail",
         -- ISO strings, like every other timestamp the admin renders. See
         -- src/lib/admin/when.ts for why the boundary is a string everywhere.
         to_char(r.requested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "requestedAt",
         to_char(r.settled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "settledAt",
         r.provider_status as "providerStatus", r.error
  from refunds r join orders o on o.id = r.order_id
`;

export async function listRefunds(limit = 50): Promise<RefundRow[]> {
  if (!sql) return [];
  return sql<RefundRow[]>`
    ${sql.unsafe(SELECT)} order by r.requested_at desc limit ${limit}
  `;
}

export async function refundsFor(reference: string): Promise<RefundRow[]> {
  if (!sql) return [];
  return sql<RefundRow[]>`
    ${sql.unsafe(SELECT)} where o.reference = ${reference} order by r.requested_at desc
  `;
}

/** What is still refundable on an order: what was paid, less everything already
 * refunded or in flight. A refund that failed frees its amount again. */
export async function refundableKobo(reference: string): Promise<number> {
  if (!sql) return 0;
  const [row] = await sql<{ left: string }[]>`
    select o.total_kobo - coalesce(sum(r.amount_kobo) filter
             (where r.status in ('pending', 'processed')), 0) as left
    from orders o
    left join refunds r on r.order_id = o.id
    where o.reference = ${reference} and o.status in ('paid', 'refunded')
    group by o.id
  `;
  return Math.max(0, Number(row?.left ?? 0));
}

export type RequestResult = { ok: true; refundId: string } | { ok: false; message: string };

/**
 * Asks Paystack for a refund and records it either way.
 *
 * The row is written before the call, so a refund Paystack accepted but never told us
 * about still leaves a trace. The amount is checked against what is actually left
 * rather than against the order total, or two people refunding at once could return
 * more than the customer ever paid.
 */
export async function requestRefund(input: {
  reference: string;
  amountKobo: number;
  reason: string;
  actor: { id: string; email: string };
}): Promise<RequestResult> {
  const db = requireSql();
  const { reference, amountKobo, reason, actor } = input;

  const [order] = await db<{ id: string; status: string; total_kobo: string }[]>`
    select id, status, total_kobo from orders where reference = ${reference}
  `;
  if (!order) return { ok: false, message: "That order does not exist." };
  if (order.status !== "paid" && order.status !== "refunded") {
    return {
      ok: false,
      message: `Only a paid order can be refunded. This one is ${order.status}.`,
    };
  }

  const left = await refundableKobo(reference);
  if (left <= 0) return { ok: false, message: "Nothing left to refund on this order." };
  if (amountKobo > left) {
    return { ok: false, message: `Only ${left / 100} naira is still refundable.` };
  }

  const [refund] = await db<{ id: string }[]>`
    insert into refunds (order_id, amount_kobo, reason, requested_by, requested_email)
    values (${Number(order.id)}, ${amountKobo}, ${reason}, ${Number(actor.id)}, ${actor.email})
    returning id
  `;

  const result = await refundTransaction({
    reference,
    // Paystack refunds the whole transaction when no amount is given. Passing the
    // exact figure keeps a full refund and a partial one on the same code path.
    amountKobo,
    merchantNote: reason,
  });

  if (!result.ok) {
    await db`
      update refunds set status = 'failed', error = ${result.message.slice(0, 500)}
      where id = ${Number(refund.id)}
    `;
    return { ok: false, message: result.message };
  }

  await db`
    update refunds set provider_id = ${result.providerId}, provider_status = ${result.status}
    where id = ${Number(refund.id)}
  `;

  await db`
    insert into order_events (order_id, actor_id, actor_email, kind, to_value, note)
    values (${Number(order.id)}, ${Number(actor.id)}, ${actor.email}, 'refund_requested',
            ${String(amountKobo)}, ${reason.slice(0, 500)})
  `;

  await settleOrderStatus(reference);
  return { ok: true, refundId: refund.id };
}

/** Marks the order refunded only once everything paid has been returned. A partial
 * refund leaves it paid, because it still is. */
export async function settleOrderStatus(reference: string) {
  const db = requireSql();
  const left = await refundableKobo(reference);
  if (left > 0) return;
  await db`
    update orders set status = 'refunded'
    where reference = ${reference} and status = 'paid'
  `;
}

/** Applied from the Paystack webhook, which is the only thing that knows whether the
 * money actually went back. */
export async function recordRefundOutcome(input: {
  providerId: string;
  status: "processed" | "failed";
  raw: unknown;
}) {
  const db = requireSql();
  const rows = await db<{ reference: string }[]>`
    update refunds r set
      status = ${input.status},
      provider_status = ${input.status},
      settled_at = ${input.status === "processed" ? db`now()` : db`null`},
      raw = ${db.json(input.raw as never)}
    from orders o
    where o.id = r.order_id and r.provider_id = ${input.providerId}
    returning o.reference
  `;

  if (rows[0]) await settleOrderStatus(rows[0].reference);
  return rows.length > 0;
}
