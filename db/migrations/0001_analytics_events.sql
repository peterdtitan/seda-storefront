-- Analytics event stream. Every storefront interaction the admin and superuser
-- dashboards report on lands here as one immutable row.
--
-- Apply with:  psql "$DATABASE_URL" -f db/migrations/0001_analytics_events.sql

create table if not exists analytics_events (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz  not null default now(),

  -- visitor_id persists across sessions, session_id does not. Neither is a person:
  -- both are random, first-party, and carry no personal data.
  visitor_id    text         not null,
  session_id    text         not null,

  name          text         not null,
  path          text,
  referrer      text,

  -- Denormalised on purpose. The catalogue lives in Sanity, so these cannot be
  -- foreign keys, and a report must still read correctly after a product is renamed.
  product_id    text,
  product_slug  text,
  product_name  text,
  colourway     text,
  size          text,

  quantity      integer,
  value_kobo    bigint,

  country       text,
  user_agent    text,
  props         jsonb        not null default '{}'::jsonb,

  constraint analytics_events_quantity_sane check (quantity is null or quantity between 0 and 1000),
  constraint analytics_events_value_sane    check (value_kobo is null or value_kobo >= 0)
);

create index if not exists analytics_events_name_time_idx
  on analytics_events (name, occurred_at desc);

create index if not exists analytics_events_product_idx
  on analytics_events (product_slug, name, occurred_at desc)
  where product_slug is not null;

create index if not exists analytics_events_session_idx
  on analytics_events (session_id, occurred_at);

create index if not exists analytics_events_time_idx
  on analytics_events (occurred_at desc);
