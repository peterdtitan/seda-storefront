-- Custom requests from the contact form. Kept in Postgres rather than the CMS: these
-- are messages from people, not content, and the admin panel will list them next to
-- orders. See docs/ADMIN_ROADMAP.md.
--
--   psql "$DATABASE_URL" -f db/migrations/0002_contact_requests.sql

create table if not exists contact_requests (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),

  name         text        not null,
  email        text        not null,
  message      text        not null,

  status       text        not null default 'new',
  handled_by   text,
  handled_at   timestamptz,

  country      text,
  user_agent   text,

  constraint contact_requests_status_known
    check (status in ('new', 'in_progress', 'answered', 'spam')),
  constraint contact_requests_name_len    check (char_length(name) between 1 and 120),
  constraint contact_requests_email_len   check (char_length(email) between 3 and 254),
  constraint contact_requests_message_len check (char_length(message) between 1 and 4000)
);

create index if not exists contact_requests_status_idx
  on contact_requests (status, received_at desc);

create index if not exists contact_requests_received_idx
  on contact_requests (received_at desc);
