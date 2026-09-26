import "server-only";

import { sql } from "@/lib/db";

import { cached, TAGS } from "./cache";

export type Takings = {
  settledKobo: number;
  settledCount: number;
  pendingKobo: number;
  pendingCount: number;
  failedCount: number;
  refundedKobo: number;
  refundedCount: number;
};

const NO_TAKINGS: Takings = {
  settledKobo: 0,
  settledCount: 0,
  pendingKobo: 0,
  pendingCount: 0,
  failedCount: 0,
  refundedKobo: 0,
  refundedCount: 0,
};

async function readTakings(days = 30): Promise<Takings> {
  if (!sql) return NO_TAKINGS;

  const [row] = await sql<Record<keyof Takings, string>[]>`
    select
      coalesce(sum(total_kobo) filter (where status = 'paid'), 0) as "settledKobo",
      count(*) filter (where status = 'paid')                     as "settledCount",
      coalesce(sum(total_kobo) filter (where status = 'pending'), 0) as "pendingKobo",
      count(*) filter (where status = 'pending')                  as "pendingCount",
      count(*) filter (where status = 'failed')                   as "failedCount",
      coalesce(sum(total_kobo) filter (where status = 'refunded'), 0) as "refundedKobo",
      count(*) filter (where status = 'refunded')                 as "refundedCount"
    from orders
    where placed_at >= now() - make_interval(days => ${days})
  `;

  if (!row) return NO_TAKINGS;
  return Object.fromEntries(
    Object.keys(NO_TAKINGS).map((key) => [key, Number(row[key as keyof Takings] ?? 0)]),
  ) as Takings;
}

/**
 * Timestamps cross the cache as ISO strings.
 *
 * unstable_cache serialises through JSON, so a Date goes in and a string comes out —
 * while the types still claim Date, because the helper is typed as returning whatever
 * the wrapped function returns. That unsoundness cost a runtime crash. Saying string
 * here puts the boundary in the type system, where the compiler finds every caller.
 */
export type PaymentRow = {
  reference: string;
  name: string;
  status: string;
  totalKobo: number;
  channel: string | null;
  paystackStatus: string | null;
  paidAt: string | null;
  placedAt: string;
  webhooks: number;
};

async function readRecentPayments(limit = 40): Promise<PaymentRow[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      reference: string;
      name: string;
      status: string;
      total_kobo: string;
      channel: string | null;
      paystack_status: string | null;
      paid_at: Date | null;
      placed_at: Date;
      webhooks: string;
    }[]
  >`
    select o.reference, o.name, o.status, o.total_kobo, o.channel, o.paystack_status,
           o.paid_at, o.placed_at,
           (select count(*) from paystack_events e where e.reference = o.reference) as webhooks
    from orders o
    order by o.placed_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    reference: row.reference,
    name: row.name,
    status: row.status,
    totalKobo: Number(row.total_kobo),
    channel: row.channel,
    paystackStatus: row.paystack_status,
    paidAt: row.paid_at?.toISOString() ?? null,
    placedAt: row.placed_at.toISOString(),
    webhooks: Number(row.webhooks),
  }));
}

export type Concern = {
  kind: "stuck_pending" | "no_webhook" | "stock_error";
  reference: string;
  name: string;
  totalKobo: number;
  placedAt: string;
  detail: string | null;
};

/**
 * What our own records say is odd, before asking Paystack anything.
 *
 * These are cheap — one query, no network — and they are what decides which handful of
 * references are worth a live verification. Checking every order against Paystack on
 * every page load would be slow and would burn the rate limit for nothing.
 */
async function readConcerns(): Promise<Concern[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      kind: Concern["kind"];
      reference: string;
      name: string;
      total_kobo: string;
      placed_at: Date;
      detail: string | null;
    }[]
  >`
    -- Someone reached Paystack and never came back. Usually abandonment; sometimes a
    -- webhook that never arrived, which means money taken and nothing fulfilled.
    select 'stuck_pending' as kind, reference, name, total_kobo, placed_at, null as detail
    from orders
    where status = 'pending'
      and placed_at < now() - interval '30 minutes'
      and placed_at > now() - interval '30 days'

    union all

    -- Paid, but no webhook was ever recorded for it: the callback page did the work
    -- alone. Fine in itself, worth seeing if it becomes the norm.
    select 'no_webhook', o.reference, o.name, o.total_kobo, o.placed_at, null
    from orders o
    where o.status = 'paid'
      and not exists (select 1 from paystack_events e where e.reference = o.reference)

    union all

    select 'stock_error', reference, name, total_kobo, placed_at, stock_error
    from orders
    where stock_error is not null

    order by placed_at desc
    limit 100
  `;

  return rows.map((row) => ({
    kind: row.kind,
    reference: row.reference,
    name: row.name,
    totalKobo: Number(row.total_kobo),
    placedAt: row.placed_at.toISOString(),
    detail: row.detail,
  }));
}

export const takings = cached("payments:takings", TAGS.orders, readTakings);
export const recentPayments = cached("payments:recent", TAGS.orders, readRecentPayments);
export const concerns = cached("payments:concerns", TAGS.orders, readConcerns);
