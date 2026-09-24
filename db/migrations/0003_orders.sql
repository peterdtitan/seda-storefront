-- Orders and their payment state. Postgres rather than the CMS: an order is a
-- financial record, not content, and it must not be editable in a Studio.
-- See docs/ADMIN_ROADMAP.md.
--
--   psql "$DATABASE_URL" -f db/migrations/0003_orders.sql

create table if not exists orders (
  id              bigint generated always as identity primary key,
  reference       text        not null unique,
  placed_at       timestamptz not null default now(),

  status          text        not null default 'pending',

  -- Money is kobo everywhere, as it is in the app. Never a float.
  subtotal_kobo   bigint      not null,
  delivery_kobo   bigint      not null default 0,
  total_kobo      bigint      not null,

  currency        text        not null default 'NGN',

  email           text        not null,
  name            text        not null,
  phone           text,
  address         text,
  city            text,
  state           text,

  -- What Paystack told us, kept verbatim for reconciliation and disputes.
  paystack_status text,
  paid_at         timestamptz,
  channel         text,
  gateway_response text,
  raw_event       jsonb,

  constraint orders_status_known
    check (status in ('pending', 'paid', 'failed', 'abandoned', 'refunded')),
  constraint orders_totals_positive
    check (subtotal_kobo >= 0 and delivery_kobo >= 0 and total_kobo >= 0),
  constraint orders_total_adds_up
    check (total_kobo = subtotal_kobo + delivery_kobo),
  constraint orders_email_len check (char_length(email) between 3 and 254),
  constraint orders_name_len  check (char_length(name) between 1 and 120)
);

-- Line items are frozen at purchase time. The CMS is free to change a price or
-- retire a colourway afterwards; what the customer paid for must not move.
create table if not exists order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint      not null references orders (id) on delete cascade,

  product_slug  text        not null,
  product_name  text        not null,
  colour_slug   text        not null,
  colour_name   text        not null,
  size          text        not null,
  quantity      integer     not null,
  unit_kobo     bigint      not null,
  line_kobo     bigint      not null,

  constraint order_items_quantity_positive check (quantity between 1 and 10),
  constraint order_items_line_adds_up      check (line_kobo = unit_kobo * quantity)
);

create index if not exists orders_status_idx   on orders (status, placed_at desc);
create index if not exists orders_placed_idx   on orders (placed_at desc);
create index if not exists orders_email_idx    on orders (lower(email));
create index if not exists order_items_order_idx on order_items (order_id);

-- Every webhook Paystack sends, stored before it is acted on. Paystack retries, so
-- the unique constraint is what makes replay harmless: a second delivery of the same
-- event loses the insert race and is skipped rather than paying an order twice.
create table if not exists paystack_events (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),
  event_id     text        not null unique,
  event_type   text        not null,
  reference    text,
  payload      jsonb       not null,
  processed_at timestamptz
);

create index if not exists paystack_events_reference_idx on paystack_events (reference);
