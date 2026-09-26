import "server-only";

import { sql } from "@/lib/db";

import { cached, TAGS } from "./cache";

import { FULFILMENT_STATUSES, PAYMENT_STATUSES } from "./orderStatus";

export type OrderFilters = {
  status?: string;
  fulfilment?: string;
  query?: string;
  page?: number;
};

/**
 * Timestamps cross the cache as ISO strings.
 *
 * unstable_cache serialises through JSON, so a Date goes in and a string comes out —
 * while the types still claim Date, because the helper is typed as returning whatever
 * the wrapped function returns. That unsoundness cost a runtime crash. Saying string
 * here puts the boundary in the type system, where the compiler finds every caller.
 */
export type OrderSummary = {
  reference: string;
  name: string;
  email: string;
  status: string;
  fulfilmentStatus: string;
  totalKobo: number;
  placedAt: string;
  items: number;
  stockError: string | null;
};

export type OrderPage = {
  orders: OrderSummary[];
  total: number;
  page: number;
  pages: number;
};

export const PER_PAGE = 25;

const EMPTY: OrderPage = { orders: [], total: 0, page: 1, pages: 1 };

async function readOrders(filters: OrderFilters = {}): Promise<OrderPage> {
  if (!sql) return EMPTY;

  const page = Math.max(1, filters.page ?? 1);
  // Anything not in the known set is ignored rather than passed through, so a
  // hand-edited query string cannot widen what comes back.
  const status = PAYMENT_STATUSES.includes(filters.status as never)
    ? (filters.status ?? null)
    : null;
  const fulfilment = FULFILMENT_STATUSES.includes(filters.fulfilment as never)
    ? (filters.fulfilment ?? null)
    : null;
  const query = filters.query?.trim().slice(0, 120) || null;
  const like = query ? `%${query}%` : null;

  const where = sql`
    where (${status}::text is null or o.status = ${status})
      and (${fulfilment}::text is null or o.fulfilment_status = ${fulfilment})
      and (${like}::text is null
           or o.reference ilike ${like}
           or o.email ilike ${like}
           or o.name ilike ${like})
  `;

  const [[count], rows] = await Promise.all([
    sql<{ total: string }[]>`select count(*) as total from orders o ${where}`,
    sql<
      {
        reference: string;
        name: string;
        email: string;
        status: string;
        fulfilment_status: string;
        total_kobo: string;
        placed_at: Date;
        items: string;
        stock_error: string | null;
      }[]
    >`
      select o.reference, o.name, o.email, o.status, o.fulfilment_status, o.total_kobo,
             o.placed_at, o.stock_error,
             (select count(*) from order_items i where i.order_id = o.id) as items
      from orders o
      ${where}
      order by o.placed_at desc
      limit ${PER_PAGE} offset ${(page - 1) * PER_PAGE}
    `,
  ]);

  const total = Number(count?.total ?? 0);

  return {
    orders: rows.map((row) => ({
      reference: row.reference,
      name: row.name,
      email: row.email,
      status: row.status,
      fulfilmentStatus: row.fulfilment_status,
      totalKobo: Number(row.total_kobo),
      placedAt: row.placed_at.toISOString(),
      items: Number(row.items),
      stockError: row.stock_error,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PER_PAGE)),
  };
}

export type OrderDetail = {
  reference: string;
  status: string;
  fulfilmentStatus: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  subtotalKobo: number;
  deliveryKobo: number;
  totalKobo: number;
  currency: string;
  placedAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  channel: string | null;
  paystackStatus: string | null;
  gatewayResponse: string | null;
  stockAdjustedAt: string | null;
  stockError: string | null;
  courierNote: string | null;
  items: {
    productSlug: string;
    productName: string;
    colourName: string;
    size: string;
    quantity: number;
    unitKobo: number;
    lineKobo: number;
  }[];
  events: {
    at: string;
    actorEmail: string | null;
    kind: string;
    fromValue: string | null;
    toValue: string | null;
    note: string | null;
  }[];
};

async function readOrderDetail(reference: string): Promise<OrderDetail | null> {
  if (!sql) return null;

  const [order] = await sql<
    {
      id: string;
      reference: string;
      status: string;
      fulfilment_status: string;
      name: string;
      email: string;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      subtotal_kobo: string;
      delivery_kobo: string;
      total_kobo: string;
      currency: string;
      placed_at: Date;
      paid_at: Date | null;
      delivered_at: Date | null;
      channel: string | null;
      paystack_status: string | null;
      gateway_response: string | null;
      stock_adjusted_at: Date | null;
      stock_error: string | null;
      courier_note: string | null;
    }[]
  >`select * from orders where reference = ${reference}`;

  if (!order) return null;

  const [items, events] = await Promise.all([
    sql<
      {
        product_slug: string;
        product_name: string;
        colour_name: string;
        size: string;
        quantity: number;
        unit_kobo: string;
        line_kobo: string;
      }[]
    >`
      select product_slug, product_name, colour_name, size, quantity, unit_kobo, line_kobo
      from order_items where order_id = ${Number(order.id)} order by id
    `,
    sql<
      {
        at: Date;
        actor_email: string | null;
        kind: string;
        from_value: string | null;
        to_value: string | null;
        note: string | null;
      }[]
    >`
      select at, actor_email, kind, from_value, to_value, note
      from order_events where order_id = ${Number(order.id)} order by at desc, id desc
    `,
  ]);

  return {
    reference: order.reference,
    status: order.status,
    fulfilmentStatus: order.fulfilment_status,
    name: order.name,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    state: order.state,
    subtotalKobo: Number(order.subtotal_kobo),
    deliveryKobo: Number(order.delivery_kobo),
    totalKobo: Number(order.total_kobo),
    currency: order.currency,
    placedAt: order.placed_at.toISOString(),
    paidAt: order.paid_at?.toISOString() ?? null,
    deliveredAt: order.delivered_at?.toISOString() ?? null,
    channel: order.channel,
    paystackStatus: order.paystack_status,
    gatewayResponse: order.gateway_response,
    stockAdjustedAt: order.stock_adjusted_at?.toISOString() ?? null,
    stockError: order.stock_error,
    courierNote: order.courier_note,
    items: items.map((item) => ({
      productSlug: item.product_slug,
      productName: item.product_name,
      colourName: item.colour_name,
      size: item.size,
      quantity: item.quantity,
      unitKobo: Number(item.unit_kobo),
      lineKobo: Number(item.line_kobo),
    })),
    events: events.map((event) => ({
      at: event.at.toISOString(),
      actorEmail: event.actor_email,
      kind: event.kind,
      fromValue: event.from_value,
      toValue: event.to_value,
      note: event.note,
    })),
  };
}

export const listOrders = cached("orders:list", TAGS.orders, readOrders);
export const findOrderDetail = cached("orders:detail", TAGS.orders, readOrderDetail);
