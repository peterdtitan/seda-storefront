import "server-only";

import { cached, TAGS } from "@/lib/admin/cache";
import { sanityFetch } from "@/sanity/lib/client";

import { sql } from "./db";
import { EVENTS } from "./events";

export type SalesPoint = { day: string; orders: number; revenueKobo: number; sessions: number };
export type PathRow = { path: string; views: number; sessions: number };
export type SizeRow = { size: string; picked: number };
export type CategoryRow = { category: string; views: number; addsToBag: number; rate: number };
export type Duration = {
  medianSeconds: number;
  p90Seconds: number;
  bounceRate: number;
  pagesPerSession: number;
};

/** Orders and revenue per day, on a filled axis.
 *
 * Grouped in SQL over a generated series rather than in JavaScript, so a day with no
 * sales is a zero rather than a gap the chart would silently close up. */
async function readSales(days = 30): Promise<SalesPoint[]> {
  if (!sql) return [];

  const rows = await sql<{ day: string; orders: string; revenue: string; sessions: string }[]>`
    with axis as (
      select generate_series(
        date_trunc('day', now()) - make_interval(days => ${days - 1}),
        date_trunc('day', now()),
        interval '1 day'
      )::date as day
    ),
    paid as (
      select date_trunc('day', paid_at)::date as day,
             count(*) as orders, sum(total_kobo) as revenue
      from orders
      where status in ('paid', 'refunded') and paid_at is not null
        and paid_at >= now() - make_interval(days => ${days})
      group by 1
    ),
    visits as (
      select date_trunc('day', occurred_at)::date as day,
             count(distinct session_id) as sessions
      from analytics_events
      where name = ${EVENTS.pageViewed}
        and occurred_at >= now() - make_interval(days => ${days})
      group by 1
    )
    select to_char(a.day, 'YYYY-MM-DD') as day,
           coalesce(p.orders, 0) as orders,
           coalesce(p.revenue, 0) as revenue,
           coalesce(v.sessions, 0) as sessions
    from axis a
    left join paid p on p.day = a.day
    left join visits v on v.day = a.day
    order by a.day
  `;

  return rows.map((row) => ({
    day: row.day,
    orders: Number(row.orders),
    revenueKobo: Number(row.revenue),
    sessions: Number(row.sessions),
  }));
}

/**
 * How long people stay.
 *
 * A session's length is the gap between its first and last event, which under-reads
 * the final page — nobody sends an event on the way out. A one-page visit therefore
 * measures zero, which is why it is reported as a bounce rather than folded into the
 * median and quietly dragging it down.
 */
async function readDuration(days = 30): Promise<Duration> {
  const empty = { medianSeconds: 0, p90Seconds: 0, bounceRate: 0, pagesPerSession: 0 };
  if (!sql) return empty;

  const [row] = await sql<
    { median: string | null; p90: string | null; bounced: string; total: string; pages: string }[]
  >`
    with spans as (
      select session_id,
             extract(epoch from (max(occurred_at) - min(occurred_at))) as seconds,
             count(*) filter (where name = ${EVENTS.pageViewed}) as views
      from analytics_events
      where occurred_at >= now() - make_interval(days => ${days})
      group by session_id
    )
    select
      percentile_cont(0.5) within group (order by seconds) filter (where views > 1) as median,
      percentile_cont(0.9) within group (order by seconds) filter (where views > 1) as p90,
      count(*) filter (where views <= 1) as bounced,
      count(*) as total,
      coalesce(avg(views), 0) as pages
    from spans
  `;

  const total = Number(row?.total ?? 0);
  return {
    medianSeconds: Math.round(Number(row?.median ?? 0)),
    p90Seconds: Math.round(Number(row?.p90 ?? 0)),
    bounceRate: total > 0 ? Number(row?.bounced ?? 0) / total : 0,
    pagesPerSession: Number(row?.pages ?? 0),
  };
}

async function readPaths(days = 30, limit = 12): Promise<PathRow[]> {
  if (!sql) return [];

  const rows = await sql<{ path: string; views: string; sessions: string }[]>`
    select path, count(*) as views, count(distinct session_id) as sessions
    from analytics_events
    where name = ${EVENTS.pageViewed}
      and path is not null
      and occurred_at >= now() - make_interval(days => ${days})
    group by path
    order by views desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    path: row.path,
    views: Number(row.views),
    sessions: Number(row.sessions),
  }));
}

async function readSizes(days = 30): Promise<SizeRow[]> {
  if (!sql) return [];

  const rows = await sql<{ size: string; picked: string }[]>`
    select size, count(*) as picked
    from analytics_events
    where size is not null
      and name in (${EVENTS.addedToBag}, ${EVENTS.sizeSelected})
      and occurred_at >= now() - make_interval(days => ${days})
    group by size
    order by picked desc
  `;

  return rows.map((row) => ({ size: row.size, picked: Number(row.picked) }));
}

/** Category lives in Sanity and the events only carry a slug, so the mapping is
 * fetched once and the grouping happens here. Cheaper than denormalising a category
 * onto every event and then having it go stale when a piece is recategorised. */
async function readCategories(days = 30): Promise<CategoryRow[]> {
  if (!sql) return [];

  const [catalogue, rows] = await Promise.all([
    sanityFetch<{ slug: string; category: string | null }[]>(
      `*[_type == "product" && defined(slug.current)]{ "slug": slug.current, "category": category->title }`,
    ),
    sql<{ product_slug: string; views: string; adds: string }[]>`
      select product_slug,
             count(*) filter (where name = ${EVENTS.productViewed}) as views,
             count(*) filter (where name = ${EVENTS.addedToBag}) as adds
      from analytics_events
      where product_slug is not null
        and occurred_at >= now() - make_interval(days => ${days})
      group by product_slug
    `,
  ]);

  const category = new Map(
    (catalogue ?? []).map((row) => [row.slug, row.category ?? "Uncategorised"]),
  );
  const totals = new Map<string, { views: number; adds: number }>();

  for (const row of rows) {
    const name = category.get(row.product_slug) ?? "Uncategorised";
    const running = totals.get(name) ?? { views: 0, adds: 0 };
    running.views += Number(row.views);
    running.adds += Number(row.adds);
    totals.set(name, running);
  }

  return [...totals.entries()]
    .map(([name, t]) => ({
      category: name,
      views: t.views,
      addsToBag: t.adds,
      rate: t.views > 0 ? t.adds / t.views : 0,
    }))
    .sort((a, b) => b.views - a.views);
}

export const sales = cached("insights:sales", TAGS.analytics, readSales);
export const duration = cached("insights:duration", TAGS.analytics, readDuration);
export const paths = cached("insights:paths", TAGS.analytics, readPaths);
export const sizes = cached("insights:sizes", TAGS.analytics, readSizes);
export const categories = cached("insights:categories", TAGS.analytics, readCategories);
