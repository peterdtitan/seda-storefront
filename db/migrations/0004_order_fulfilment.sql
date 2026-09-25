-- Fulfilment state, separate from payment state.
--
--   psql "$DATABASE_URL" -f db/migrations/0004_order_fulfilment.sql

-- Claimed atomically before stock is touched, so a webhook retry and the callback
-- page racing each other cannot both decrement the same order.
alter table orders add column if not exists stock_adjusted_at timestamptz;

-- Set when an adjustment was attempted and failed, so the admin can see an order
-- that was paid for but whose inventory never moved.
alter table orders add column if not exists stock_error text;

create index if not exists orders_unadjusted_idx
  on orders (placed_at desc)
  where status = 'paid' and stock_adjusted_at is null;
