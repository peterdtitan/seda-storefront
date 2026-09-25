# Admin and superuser — scope

Agreed 2026-09-22. **Nothing here is built yet.** The storefront finishes first. This file exists so the decisions that constrain the
storefront are made now rather than discovered later.

---

### Admin — `admin.wearseda.com`
Handed to the business owner.

- **Orders** — line items, customer, status, fulfilment.
- **Payments** — what settled, what is pending, what failed.
- **Analytics** — most-viewed products, most-added-to-cart, conversion by colourway.
- **Request payout** — initiate a transfer of takings. Paystack performs it.
- **Users and roles** — invite a user, scope what they can reach:

  | Role | Can reach |
  |---|---|
  | Content & products | Catalogue, copy, lookbook, imagery |
  | Refunds | Refund requests, returns, the orders behind them |
  | Delivery & customer service | Fulfilment, shipping status, customer messages |
  | Audit & finance | Read-only across orders, payments, payouts |
  | Owner | All of the above, plus inviting and scoping users |

### Superuser — separate, not a role inside the admin
For the developer.

- App usage and monitoring, error and performance signal.
- SEO results.
- Active users.
- Add or revoke any user and any role.

---

## Decisions this forces on the storefront

### 1. Orders do not go in Sanity
Sanity is a content CMS and stays the catalogue: products, colourways, looks, copy.

Orders, payments, customers, roles and analytics events are transactional. They need
constraints, transactions, real joins, and row-level authorisation. Sanity gives none
of those.

**Decided: Neon Postgres.** Sanity keeps the catalogue; Postgres holds everything that
has money or a person attached to it.

Supabase was the original recommendation because it bundles Auth and row-level
security. It lost on two points. Its free tier pauses a project after about a week of
inactivity, and a paused database means checkout throws — so production would have
meant $25/mo regardless of traffic. And the bundling is only a saving if the auth is
actually used; deciding the database and the auth provider in one go meant deciding
auth before we had looked at it.

Nothing in the app is provider-specific. Queries are raw SQL over the standard
Postgres wire protocol (`postgres`, porsager), so moving between Neon, Supabase or any
other host is a connection-string change and no code.

The seam: an order line stores the Sanity product id, the colourway key, the size, and
**the price in kobo as it was at purchase**. Never a live lookup. A price edit must
not rewrite history.

### 2. Analytics needs events fired as pages are built
"Most viewed" and "most added to cart" cannot be reconstructed after the fact.

**Open question for the client:** are they happy with first-party event capture only,
or do they also want GA4 / Plausible? That changes whether `track()` fans out.

### 3. Auth is not Sanity auth
`/studio` authenticates against Sanity's own user system. The admin panel cannot reuse
it. The roles above do not map to Sanity's, and the refunds and delivery roles have no
business in a CMS at all.

**Open: which auth provider.** Neon is a database only, so this is now a separate
decision rather than one inherited from the database. The candidates are Auth.js
(self-hosted, no per-seat cost, more to build and maintain) or a hosted provider such
as Clerk or WorkOS (less to build, priced per user — and the user count here is small,
a handful of staff rather than customers).

Whichever it is, sessions and roles live in Postgres next to the orders, so
authorisation is a join rather than a call to another service. A content manager may
*also* hold a Sanity seat; that is a second, separate grant.

### 4. Subdomain routing
`admin.wearseda.com` should be the **same Next app**, with middleware rewriting on
hostname to an `/admin` segment that is not reachable from the storefront domain. One
deploy, one set of types, one CI run. 

### 5. Paystack
Handles payment, refunds and payouts.

---
