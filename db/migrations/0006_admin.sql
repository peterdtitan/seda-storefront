-- Staff accounts, sessions, fulfilment state and the audit trail behind
-- admin.wearseda.com. See docs/ADMIN_BUILD_PLAN.md step 1.
--
--   pnpm db:migrate

-- One identity table, two tiers. The superuser is not a role inside the admin: it is
-- a separate tier, and every staff-facing query filters on tier = 'staff', which is
-- what keeps it off the admin's own user list.
create table if not exists admin_users (
  id           bigint generated always as identity primary key,
  email        text        not null unique,
  name         text,
  tier         text        not null default 'staff',
  status       text        not null default 'invited',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,

  constraint admin_users_tier_known   check (tier in ('staff', 'superuser')),
  constraint admin_users_status_known check (status in ('invited', 'active', 'suspended')),
  constraint admin_users_email_len    check (char_length(email) between 3 and 254)
);

create table if not exists admin_roles (
  user_id    bigint      not null references admin_users (id) on delete cascade,
  role       text        not null,
  granted_at timestamptz not null default now(),
  granted_by bigint      references admin_users (id) on delete set null,

  primary key (user_id, role),
  constraint admin_roles_known
    check (role in ('content', 'refunds', 'delivery', 'finance', 'owner'))
);

-- Only the hash is stored. A leaked database row cannot be replayed as a session, and
-- there is nothing here worth stealing that is not already an order row.
create table if not exists admin_sessions (
  token_hash text        primary key,
  user_id    bigint      not null references admin_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip         text
);

create index if not exists admin_sessions_user_idx on admin_sessions (user_id, expires_at desc);

-- Magic links and invites are the same shape: a single-use hashed token with an expiry.
-- Kept apart because an invite also carries the roles the account starts with.
create table if not exists admin_verification_tokens (
  token_hash text        primary key,
  email      text        not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_verification_email_idx on admin_verification_tokens (email);

create table if not exists admin_invites (
  token_hash  text        primary key,
  email       text        not null,
  roles       text[]      not null default '{}',
  tier        text        not null default 'staff',
  invited_by  bigint      references admin_users (id) on delete set null,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint admin_invites_tier_known check (tier in ('staff', 'superuser'))
);

-- Fulfilment is not payment. An order can be paid and unfulfilled, cancelled before it
-- ships, or refunded after it arrives, so the two states move independently.
alter table orders
  add column if not exists fulfilment_status     text not null default 'unfulfilled',
  add column if not exists fulfilment_updated_at timestamptz,
  add column if not exists delivered_at          timestamptz,
  add column if not exists courier_note          text;

do $$
begin
  alter table orders add constraint orders_fulfilment_known
    check (fulfilment_status in
      ('unfulfilled', 'packed', 'out_for_delivery', 'delivered', 'cancelled'));
exception
  when duplicate_object then null;
end
$$;

-- Everything the queue works through, cheapest first.
create index if not exists orders_fulfilment_idx
  on orders (fulfilment_status, placed_at desc)
  where status = 'paid';

-- Append-only. Who changed what, from what, to what. Nothing in the admin may update or
-- delete a row here; a correction is another row.
create table if not exists order_events (
  id         bigint      generated always as identity primary key,
  order_id   bigint      not null references orders (id) on delete cascade,
  at         timestamptz not null default now(),

  -- Null actor means the system did it: a webhook, or the callback page.
  actor_id   bigint      references admin_users (id) on delete set null,
  actor_email text,

  kind       text        not null,
  from_value text,
  to_value   text,
  note       text,
  meta       jsonb       not null default '{}'::jsonb
);

create index if not exists order_events_order_idx on order_events (order_id, at desc);

-- One row per customer email we intend to send, claimed before the send is attempted.
-- The unique constraint is the whole point: two admins clicking "Out for delivery" at
-- once, or a retried webhook, must not mail the customer twice.
create table if not exists email_deliveries (
  id          bigint      generated always as identity primary key,
  order_id    bigint      not null references orders (id) on delete cascade,
  kind        text        not null,
  claimed_at  timestamptz not null default now(),
  sent_at     timestamptz,
  provider_id text,
  error       text,

  unique (order_id, kind),
  constraint email_deliveries_kind_known
    check (kind in ('order_confirmation', 'out_for_delivery', 'delivered'))
);

create index if not exists email_deliveries_unsent_idx
  on email_deliveries (claimed_at)
  where sent_at is null;
