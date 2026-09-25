-- Ties a paid order back to the browsing session that placed it.
--
-- Without these, payment_succeeded is recorded against a synthetic visitor and no
-- report can join a conversion to the session that led to it.
--
--   psql "$DATABASE_URL" -f db/migrations/0005_order_attribution.sql

alter table orders
  add column if not exists visitor_id text,
  add column if not exists session_id text;

create index if not exists orders_session_idx
  on orders (session_id)
  where session_id is not null;
