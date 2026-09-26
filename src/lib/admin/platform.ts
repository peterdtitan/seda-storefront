import "server-only";

import { sql } from "@/lib/db";

export type Pulse = {
  eventsToday: number;
  eventsWeek: number;
  browserSessionsWeek: number;
  ordersWeek: number;
  contactWeek: number;
};

export type TableSize = { table: string; rows: number; bytes: number };

export type LiveSession = {
  email: string;
  tier: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
};

export type Wound = {
  kind: string;
  reference: string | null;
  detail: string;
  at: string;
};

const NO_PULSE: Pulse = {
  eventsToday: 0,
  eventsWeek: 0,
  browserSessionsWeek: 0,
  ordersWeek: 0,
  contactWeek: 0,
};

export async function pulse(): Promise<Pulse> {
  if (!sql) return NO_PULSE;

  const [row] = await sql<Record<keyof Pulse, string>[]>`
    select
      (select count(*) from analytics_events where occurred_at >= date_trunc('day', now()))
        as "eventsToday",
      (select count(*) from analytics_events where occurred_at >= now() - interval '7 days')
        as "eventsWeek",
      (select count(distinct session_id) from analytics_events
        where name = 'page_viewed' and occurred_at >= now() - interval '7 days')
        as "browserSessionsWeek",
      (select count(*) from orders where placed_at >= now() - interval '7 days')
        as "ordersWeek",
      (select count(*) from contact_requests where received_at >= now() - interval '7 days')
        as "contactWeek"
  `;

  if (!row) return NO_PULSE;
  return Object.fromEntries(
    Object.keys(NO_PULSE).map((key) => [key, Number(row[key as keyof Pulse] ?? 0)]),
  ) as Pulse;
}

/** How much the database is actually carrying. Neon bills on storage, and an
 * analytics table nobody prunes is the thing that grows without anyone deciding to. */
export async function tableSizes(): Promise<TableSize[]> {
  if (!sql) return [];

  const rows = await sql<{ table: string; rows: string; bytes: string }[]>`
    select c.relname as table,
           c.reltuples::bigint as rows,
           pg_total_relation_size(c.oid) as bytes
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by pg_total_relation_size(c.oid) desc
  `;

  return rows.map((row) => ({
    table: row.table,
    rows: Math.max(0, Number(row.rows)),
    bytes: Number(row.bytes),
  }));
}

export async function liveSessions(): Promise<LiveSession[]> {
  if (!sql) return [];

  return sql<LiveSession[]>`
    -- ISO strings, matching every other timestamp the admin renders. These two are
    -- not cached today; typing them as Dates would break the day they are.
    select u.email, u.tier,
           to_char(s.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
           to_char(s.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "expiresAt",
           s.user_agent as "userAgent"
    from admin_sessions s join admin_users u on u.id = s.user_id
    where s.expires_at > now()
    order by s.created_at desc
  `;
}

/** Everything the app knows went wrong and nobody has cleared. One list, because a
 * failed refund and an unadjusted stock count are the same kind of problem: money
 * moved and the records did not keep up. */
export async function wounds(): Promise<Wound[]> {
  if (!sql) return [];

  const rows = await sql<{ kind: string; reference: string | null; detail: string; at: string }[]>`
    select 'stock' as kind, reference, stock_error as detail,
           to_char(placed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
    from orders where stock_error is not null

    union all

    select 'email', o.reference,
           coalesce(d.error, 'claimed but never sent') || ' (' || d.kind || ')',
           to_char(d.claimed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    from email_deliveries d join orders o on o.id = d.order_id
    where d.sent_at is null

    union all

    select 'refund', o.reference, coalesce(r.error, 'still pending'),
           to_char(r.requested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    from refunds r join orders o on o.id = r.order_id
    where r.status = 'failed' or (r.status = 'pending' and r.requested_at < now() - interval '1 day')

    order by at desc
    limit 50
  `;

  return rows;
}
