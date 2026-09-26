import "server-only";

import { sql } from "@/lib/db";

import { cached, TAGS } from "./cache";

export type Summary = {
  awaitingFulfilment: number;
  outForDelivery: number;
  paidToday: number;
  revenueTodayKobo: number;
  paidWeek: number;
  revenueWeekKobo: number;
  pendingPayment: number;
  stockIssues: number;
};

/**
 * Timestamps cross the cache as ISO strings.
 *
 * unstable_cache serialises through JSON, so a Date goes in and a string comes out —
 * while the types still claim Date, because the helper is typed as returning whatever
 * the wrapped function returns. That unsoundness cost a runtime crash. Saying string
 * here puts the boundary in the type system, where the compiler finds every caller.
 */
export type RecentOrder = {
  reference: string;
  name: string;
  status: string;
  fulfilmentStatus: string;
  totalKobo: number;
  placedAt: string;
  items: number;
};

const EMPTY: Summary = {
  awaitingFulfilment: 0,
  outForDelivery: 0,
  paidToday: 0,
  revenueTodayKobo: 0,
  paidWeek: 0,
  revenueWeekKobo: 0,
  pendingPayment: 0,
  stockIssues: 0,
};

type Row = Record<keyof Summary, string>;

async function readSummary(): Promise<Summary> {
  if (!sql) return EMPTY;

  // One pass over orders. Everything here is a count or a sum over the same rows, and
  // seven round trips to answer one screen is six too many.
  const [row] = await sql<Row[]>`
    select
      count(*) filter (where status = 'paid' and fulfilment_status = 'unfulfilled')
        as "awaitingFulfilment",
      count(*) filter (where fulfilment_status = 'out_for_delivery')
        as "outForDelivery",
      count(*) filter (where status = 'paid' and paid_at >= date_trunc('day', now()))
        as "paidToday",
      coalesce(sum(total_kobo) filter
        (where status = 'paid' and paid_at >= date_trunc('day', now())), 0)
        as "revenueTodayKobo",
      count(*) filter (where status = 'paid' and paid_at >= now() - interval '7 days')
        as "paidWeek",
      coalesce(sum(total_kobo) filter
        (where status = 'paid' and paid_at >= now() - interval '7 days'), 0)
        as "revenueWeekKobo",
      -- A pending order is someone who reached Paystack and has not come back. Worth
      -- seeing: a pile of them means the payment step is failing, not that nobody buys.
      count(*) filter (where status = 'pending' and placed_at >= now() - interval '7 days')
        as "pendingPayment",
      count(*) filter (where stock_error is not null) as "stockIssues"
    from orders
  `;

  if (!row) return EMPTY;
  return Object.fromEntries(
    Object.keys(EMPTY).map((key) => [key, Number(row[key as keyof Summary] ?? 0)]),
  ) as Summary;
}

async function readRecentOrders(limit = 8): Promise<RecentOrder[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      reference: string;
      name: string;
      status: string;
      fulfilment_status: string;
      total_kobo: string;
      placed_at: Date;
      items: string;
    }[]
  >`
    select o.reference, o.name, o.status, o.fulfilment_status, o.total_kobo, o.placed_at,
           count(i.id) as items
    from orders o
    left join order_items i on i.order_id = o.id
    group by o.id
    order by o.placed_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    reference: row.reference,
    name: row.name,
    status: row.status,
    fulfilmentStatus: row.fulfilment_status,
    totalKobo: Number(row.total_kobo),
    placedAt: row.placed_at.toISOString(),
    items: Number(row.items),
  }));
}

export const summary = cached("dashboard:summary", TAGS.orders, readSummary);
export const recentOrders = cached("dashboard:recent", TAGS.orders, readRecentOrders);
