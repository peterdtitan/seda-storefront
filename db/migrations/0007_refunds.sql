-- Refunds. One order can be refunded more than once — a damaged item today, the
-- delivery fee next week — so this is its own table rather than columns on orders.
--
--   pnpm db:migrate

create table if not exists refunds (
  id             bigint generated always as identity primary key,
  order_id       bigint      not null references orders (id) on delete cascade,

  -- Paystack's own id for the refund, once it has one. Null while we are still
  -- waiting to hear back.
  provider_id    text,

  amount_kobo    bigint      not null,
  reason         text        not null,
  status         text        not null default 'pending',

  requested_by   bigint      references admin_users (id) on delete set null,
  requested_email text       not null,
  requested_at   timestamptz not null default now(),
  settled_at     timestamptz,

  -- What Paystack said, kept verbatim for a dispute.
  provider_status text,
  error          text,
  raw            jsonb,

  constraint refunds_status_known
    check (status in ('pending', 'processed', 'failed')),
  constraint refunds_amount_positive check (amount_kobo > 0),
  constraint refunds_reason_len check (char_length(reason) between 3 and 500)
);

create index if not exists refunds_order_idx on refunds (order_id, requested_at desc);
create index if not exists refunds_status_idx on refunds (status, requested_at desc);

create unique index if not exists refunds_provider_id_idx
  on refunds (provider_id)
  where provider_id is not null;
