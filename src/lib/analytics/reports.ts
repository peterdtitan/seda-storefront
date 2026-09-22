import "server-only";

import { sql, warnUnconfigured } from "./db";
import { EVENTS } from "./events";

/**
 * The aggregates both dashboards read. The admin sees these scoped to the store; the
 * superuser sees the same shapes plus platform-wide rows. Defined once so the two
 * surfaces can never disagree about what "most viewed" means.
 */

export type ProductRanking = {
  productSlug: string;
  productName: string;
  views: number;
  addsToBag: number;
  addToBagRate: number;
};

export type TrafficPoint = { day: string; sessions: number; views: number };

export type FunnelCounts = {
  productViews: number;
  addsToBag: number;
  bagViews: number;
  checkoutsStarted: number;
};

const EMPTY_FUNNEL: FunnelCounts = {
  productViews: 0,
  addsToBag: 0,
  bagViews: 0,
  checkoutsStarted: 0,
};

function unavailable<T>(fallback: T): T {
  warnUnconfigured();
  return fallback;
}

export async function topProducts(days = 30, limit = 10): Promise<ProductRanking[]> {
  if (!sql) return unavailable([]);

  const rows = await sql<
    { product_slug: string; product_name: string; views: string; adds: string }[]
  >`
    select
      product_slug,
      max(product_name) as product_name,
      count(*) filter (where name = ${EVENTS.productViewed}) as views,
      count(*) filter (where name = ${EVENTS.addedToBag}) as adds
    from analytics_events
    where product_slug is not null
      and occurred_at >= now() - make_interval(days => ${days})
      and name in (${EVENTS.productViewed}, ${EVENTS.addedToBag})
    group by product_slug
    order by views desc
    limit ${limit}
  `;

  return rows.map((row) => {
    const views = Number(row.views);
    const addsToBag = Number(row.adds);
    return {
      productSlug: row.product_slug,
      productName: row.product_name,
      views,
      addsToBag,
      addToBagRate: views > 0 ? addsToBag / views : 0,
    };
  });
}

export async function funnel(days = 30): Promise<FunnelCounts> {
  if (!sql) return unavailable(EMPTY_FUNNEL);

  const [row] = await sql<
    { product_views: string; adds: string; bag_views: string; checkouts: string }[]
  >`
    select
      count(*) filter (where name = ${EVENTS.productViewed})   as product_views,
      count(*) filter (where name = ${EVENTS.addedToBag})      as adds,
      count(*) filter (where name = ${EVENTS.bagViewed})       as bag_views,
      count(*) filter (where name = ${EVENTS.checkoutStarted}) as checkouts
    from analytics_events
    where occurred_at >= now() - make_interval(days => ${days})
  `;

  return {
    productViews: Number(row?.product_views ?? 0),
    addsToBag: Number(row?.adds ?? 0),
    bagViews: Number(row?.bag_views ?? 0),
    checkoutsStarted: Number(row?.checkouts ?? 0),
  };
}

export async function traffic(days = 30): Promise<TrafficPoint[]> {
  if (!sql) return unavailable([]);

  const rows = await sql<{ day: string; sessions: string; views: string }[]>`
    select
      to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') as day,
      count(distinct session_id) as sessions,
      count(*) filter (where name = ${EVENTS.pageViewed}) as views
    from analytics_events
    where occurred_at >= now() - make_interval(days => ${days})
    group by 1
    order by 1
  `;

  return rows.map((row) => ({
    day: row.day,
    sessions: Number(row.sessions),
    views: Number(row.views),
  }));
}

export async function topColourways(days = 30, limit = 10) {
  if (!sql) return unavailable([]);

  const rows = await sql<{ product_name: string; colourway: string; adds: string }[]>`
    select max(product_name) as product_name, colourway, count(*) as adds
    from analytics_events
    where name = ${EVENTS.addedToBag}
      and colourway is not null
      and occurred_at >= now() - make_interval(days => ${days})
    group by product_slug, colourway
    order by adds desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    productName: row.product_name,
    colourway: row.colourway,
    addsToBag: Number(row.adds),
  }));
}
