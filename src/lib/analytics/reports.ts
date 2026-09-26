import "server-only";

import { cached, TAGS } from "@/lib/admin/cache";

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
  ordersPaid: number;
  revenueKobo: number;
};

const EMPTY_FUNNEL: FunnelCounts = {
  productViews: 0,
  addsToBag: 0,
  bagViews: 0,
  checkoutsStarted: 0,
  ordersPaid: 0,
  revenueKobo: 0,
};

function unavailable<T>(fallback: T): T {
  warnUnconfigured();
  return fallback;
}

async function read_topProducts(days = 30, limit = 10): Promise<ProductRanking[]> {
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

async function read_funnel(days = 30): Promise<FunnelCounts> {
  if (!sql) return unavailable(EMPTY_FUNNEL);

  const [row] = await sql<
    {
      product_views: string;
      adds: string;
      bag_views: string;
      checkouts: string;
      paid: string;
      revenue: string;
    }[]
  >`
    select
      count(*) filter (where name = ${EVENTS.productViewed})   as product_views,
      count(*) filter (where name = ${EVENTS.addedToBag})      as adds,
      count(*) filter (where name = ${EVENTS.bagViewed})       as bag_views,
      count(*) filter (where name = ${EVENTS.checkoutStarted}) as checkouts,
      count(*) filter (where name = ${EVENTS.paymentSucceeded}) as paid,
      coalesce(sum(value_kobo) filter (where name = ${EVENTS.paymentSucceeded}), 0) as revenue
    from analytics_events
    where occurred_at >= now() - make_interval(days => ${days})
  `;

  return {
    productViews: Number(row?.product_views ?? 0),
    addsToBag: Number(row?.adds ?? 0),
    bagViews: Number(row?.bag_views ?? 0),
    checkoutsStarted: Number(row?.checkouts ?? 0),
    ordersPaid: Number(row?.paid ?? 0),
    revenueKobo: Number(row?.revenue ?? 0),
  };
}

async function read_traffic(days = 30): Promise<TrafficPoint[]> {
  if (!sql) return unavailable([]);

  const rows = await sql<{ day: string; sessions: string; views: string }[]>`
    select
      to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') as day,
      -- Sessions are counted from page views alone. Anything recorded server side
      -- carries an id no browser ever held, and would otherwise count as a visit.
      count(distinct session_id) filter (where name = ${EVENTS.pageViewed}) as sessions,
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

async function read_topColourways(days = 30, limit = 10) {
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

export type ColourwayConversion = {
  productName: string;
  colourway: string;
  views: number;
  addsToBag: number;
  rate: number;
};

/** The question the buyer actually asks: which colour is worth cutting more of.
 *
 * Views are counted per product rather than per colourway — a product view does not
 * carry a colour until one is chosen — so the rate is adds-to-bag for this colour
 * against views of the piece it belongs to. */
async function read_colourwayConversion(days = 30, limit = 12) {
  if (!sql) return unavailable<ColourwayConversion[]>([]);

  const rows = await sql<
    { product_name: string; colourway: string; adds: string; views: string }[]
  >`
    with adds as (
      select product_slug, colourway, max(product_name) as product_name, count(*) as adds
      from analytics_events
      where name = ${EVENTS.addedToBag}
        and colourway is not null
        and occurred_at >= now() - make_interval(days => ${days})
      group by product_slug, colourway
    ),
    views as (
      select product_slug, count(*) as views
      from analytics_events
      where name = ${EVENTS.productViewed}
        and occurred_at >= now() - make_interval(days => ${days})
      group by product_slug
    )
    select a.product_name, a.colourway, a.adds, coalesce(v.views, 0) as views
    from adds a left join views v on v.product_slug = a.product_slug
    order by a.adds desc
    limit ${limit}
  `;

  return rows.map((row) => {
    const views = Number(row.views);
    const addsToBag = Number(row.adds);
    return {
      productName: row.product_name,
      colourway: row.colourway,
      views,
      addsToBag,
      rate: views > 0 ? addsToBag / views : 0,
    };
  });
}

export type Campaign = {
  source: string;
  campaign: string | null;
  sessions: number;
  orders: number;
};

/** Where the people who bought actually came from. Only possible because the
 * conversion event now carries the session that browsed. */
async function read_campaigns(days = 30) {
  if (!sql) return unavailable<Campaign[]>([]);

  const rows = await sql<
    { source: string; campaign: string | null; sessions: string; orders: string }[]
  >`
    with tagged as (
      select distinct session_id,
             props->>'utm_source' as source,
             props->>'utm_campaign' as campaign
      from analytics_events
      where props->>'utm_source' is not null
        and occurred_at >= now() - make_interval(days => ${days})
    ),
    bought as (
      select distinct session_id from analytics_events
      where name = ${EVENTS.paymentSucceeded}
        and occurred_at >= now() - make_interval(days => ${days})
    )
    select t.source, t.campaign,
           count(*) as sessions,
           count(*) filter (where b.session_id is not null) as orders
    from tagged t left join bought b on b.session_id = t.session_id
    group by t.source, t.campaign
    order by sessions desc
    limit 20
  `;

  return rows.map((row) => ({
    source: row.source,
    campaign: row.campaign,
    sessions: Number(row.sessions),
    orders: Number(row.orders),
  }));
}

export const topProducts = cached("analytics:topProducts", TAGS.analytics, read_topProducts);
export const funnel = cached("analytics:funnel", TAGS.analytics, read_funnel);
export const traffic = cached("analytics:traffic", TAGS.analytics, read_traffic);
export const topColourways = cached("analytics:topColourways", TAGS.analytics, read_topColourways);
export const colourwayConversion = cached(
  "analytics:colourwayConversion",
  TAGS.analytics,
  read_colourwayConversion,
);
export const campaigns = cached("analytics:campaigns", TAGS.analytics, read_campaigns);
