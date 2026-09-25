# Build plan — Șèdá admin and superuser

Scope lives in `ADMIN_ROADMAP.md`. This file is the working agreement for how it gets built.

Same ground rules as the storefront plan: one commit per step, in order; every commit builds;
Conventional Commits; pause and report after each one. One branch per step, PR into `dev`.

## Decisions taken 2026-09-25

| | |
|---|---|
| Database | Neon Postgres, already running |
| Auth | **Auth.js v5, email magic links.** Sessions and roles in Neon, so authorisation is a join and not a network call. No per-seat cost. |
| Email | **Resend.** 3,000/mo free covers a store this size, React Email templates carry the brand, and it doubles as the magic-link sender. |
| Customer emails | Order confirmation on payment, out for delivery, delivered. |
| Routing | `admin.wearseda.com` rewrites to `/admin` in the same Next app. One deploy, one CI run. |

---

## 1 — Schema: staff, sessions, fulfilment, audit

Migration `0006_admin.sql`.

- `admin_users` — email, name, tier (`staff` / `superuser`), status, timestamps.
  One identity table, two tiers. The admin's user list filters `tier = 'staff'`, which is
  how the superuser stays invisible there.
- `admin_roles` — user to role, many-to-many. Roles are `content`, `refunds`, `delivery`,
  `finance`, `owner`.
- `admin_sessions` — token **hash**, user, expiry, user agent. Never the raw token.
- `admin_invites` and `admin_verification_tokens` — both hashed, both single-use.
- `orders` gains `fulfilment_status`, `fulfilment_updated_at`, `delivered_at`, `courier_note`.
  Fulfilment is separate from payment state: an order can be paid and unfulfilled, or
  refunded after delivery.
- `order_events` — the audit trail. Who changed what, from what, to what, when. Append-only.
- `email_deliveries` — unique on `(order_id, kind)`, so a double-click cannot email a
  customer twice. Same discipline as `paystack_events`.

`feat(admin): add staff, session, fulfilment and audit schema`

## 2 — Auth.js magic links

- `src/lib/auth/` — Auth.js v5 config with a hand-written Neon adapter, matching the raw-SQL
  style of `src/lib/orders/store.ts` rather than pulling in an ORM for five tables.
- Sign-in at `/admin/sign-in`. Email only; no passwords to leak or reset.
- Sessions are opaque tokens, hashed at rest, rotated on sign-in, and revocable from the
  users screen.
- A sign-in attempt for an address with no `admin_users` row does nothing and says the same
  thing as a successful one, so the form cannot be used to enumerate staff.

`feat(admin): authenticate staff with auth.js magic links`

## 3 — Subdomain routing and the admin shell

- `middleware.ts` rewrites `admin.wearseda.com/*` to `/admin/*`, and 404s `/admin` on the
  storefront host so the panel is not reachable from `wearseda.com`.
- Admin layout: its own nav, sign-out, and a denser scope of the same tokens. The admin is
  a tool, not a shop window — smaller type, tighter rhythm, tabular numerals everywhere.
- Unauthenticated requests redirect to sign-in with the intended path preserved.
- `robots.ts` already disallows `/admin`-shaped paths; confirm and extend.

`feat(admin): route the admin subdomain and build the shell`

## 4 — Roles and authorisation

- `src/lib/auth/roles.ts` — one table mapping role to permission. The nav hides what a role
  cannot reach; a server-side `requirePermission()` on every page and action is what actually
  enforces it. Hiding a link is not authorisation.
- Superuser is not a role in this table. It is a tier, checked separately.

`feat(admin): scope every screen and action to a role`

## 5 — Orders

- List: filter by payment status and fulfilment status, search by reference, email or name,
  newest first, paginated.
- Detail: line items as bought, customer, payment and Paystack state, stock adjustment and
  any `stock_error`, and the full `order_events` timeline.
- Money formatted with the existing `formatNaira`; never a float, never a live price lookup.

`feat(admin): list and inspect orders`

## 6 — Fulfilment and the customer emails

The step the whole panel exists for.

- Status moves `unfulfilled` → `packed` → `out_for_delivery` → `delivered`, plus `cancelled`.
  Transitions are guarded server-side: only legal moves, only by a role that holds
  `fulfilment`, every one written to `order_events` with the actor.
- Resend + React Email. Three templates on the brand's own type and palette:
  confirmation on payment, out for delivery, delivered.
- Confirmation is wired into `fulfilOrder`, so it fires from the webhook or the callback,
  whichever arrives first, and exactly once.
- Every send is claimed through `email_deliveries` before it is attempted. A failed send
  releases the claim and surfaces on the order; it never silently drops.

`feat(admin): update fulfilment status and email the customer`

## 7 — Payments

- Settled, pending and failed, read from `orders` joined to `paystack_events`.
- A reconciliation view: what Paystack says against what we recorded, so an amount mismatch
  or a missed webhook is visible rather than inferred.

`feat(admin): show payments and reconcile them against paystack`

## 8 — Refunds

- Request a refund against a paid order, full or partial, through Paystack's refund API.
- Scoped to the `refunds` role. Reason required. Written to `order_events`.
- Refund state comes back by webhook, same idempotency as payment.

`feat(admin): refund orders through paystack`

## 9 — Analytics

- Reuse `src/lib/analytics/reports.ts` — funnel, traffic, top products, top colourways —
  now that conversions carry a real session and the funnel has its paid step.
- Add conversion by colourway, which is the question the buyer actually asks.

`feat(admin): analytics dashboard`

## 10 — Payout

- Balance and a request-payout action through Paystack Transfers.
- Owner only, confirmation step, written to the audit trail.

`feat(admin): request a payout`

## 11 — Users and roles

- Invite by email, scope roles, revoke, and kill a live session.
- Owner only. The list filters `tier = 'staff'`, so the superuser never appears.

`feat(admin): invite and scope staff`

## 12 — Superuser

Separate sign-in, separate surface, not a role inside the admin.

- Usage and monitoring, error and performance signal.
- SEO results.
- Active sessions across both tiers.
- Grant or revoke any user and any role, including owners.
- Transactions and pending settlements.

`feat(superuser): platform monitoring and role administration`

---

## Environment this adds

```
AUTH_SECRET=              # openssl rand -base64 32
AUTH_URL=                 # https://admin.wearseda.com in production
RESEND_API_KEY=
EMAIL_FROM=               # orders@wearseda.com, on a verified domain
```
