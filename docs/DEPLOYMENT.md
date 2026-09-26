# Deployment

One Next app, one Vercel project, two hostnames. The admin is not a separate
deployment and should not become one: it shares the database client, the Paystack
client, the Sanity client, the design tokens and the types with the storefront, and
splitting it would mean either duplicating all of that or publishing a package to
pass it between two repos.

## Hostnames

| Host | Serves | How |
|---|---|---|
| `pieceofseda.com` | The shop | Directly |
| `admin.pieceofseda.com` | The admin panel | `middleware.ts` rewrites `/*` to `/admin/*` |
| `admin.pieceofseda.com/superuser` | The superuser tier | Passed through, not rewritten |

`middleware.ts` keys on `host.startsWith("admin.")`, so it follows the apex domain
wherever it goes. Nothing in it names a domain.

On the shop's own hostname, `/admin` and `/superuser` answer **404** — the panel does
not exist there. On `localhost` and on `*.vercel.app` previews both are reachable at
`/admin`, because neither has an admin subdomain to rewrite from.

## Vercel

1. **Domains** → add `admin.pieceofseda.com` to the *same* project as the shop. No
   second project, no second build.
2. Point the DNS record Vercel asks for at the value Vercel gives. A `CNAME` on the
   `admin` subdomain is the usual shape.
3. Nothing else. There is no per-domain configuration: the rewrite is in the app.

## Environment

`pnpm env:push` sends everything in `.env.local` to all three targets. Two need care:

- **`NEXT_PUBLIC_SITE_URL`** must be the shop's apex, `https://pieceofseda.com`. The
  admin origin is derived from it rather than written down twice.
- **`AUTH_SECRET`** must be the same across a deployment or every session is
  invalidated when a request lands on a different instance.

`AUTH_URL` is deliberately **not** set. Auth.js runs with `trustHost: true` and builds
its callback URLs from the request, which is what lets one deployment answer on two
hostnames. Pinning `AUTH_URL` to one of them breaks the magic link on the other.

## Crawling

`isProductionSite` is decided by `VERCEL_ENV === "production"`, not by comparing the
origin to a constant. The same variables are pushed to preview and production, so an
origin match cannot tell them apart — and getting it wrong means either a preview
competing with the shop for its own search results, or the shop serving `Disallow: /`
to everybody.

Preview deployments therefore refuse every crawler. `/admin` and `/superuser` are
disallowed in `robots.txt` on every origin, and carry `noindex` besides.

## Cookies

The session cookie is set by Auth.js with no explicit `domain`, so it is host-only:
signing in at `admin.pieceofseda.com` leaves nothing readable at `pieceofseda.com`.
Do not add a domain to it. A cookie scoped to `.pieceofseda.com` would travel with
every shop request, including ones served from the edge.

## First run on a new deployment

```bash
pnpm db:migrate                                   # against the production DATABASE_URL
pnpm admin:invite you@example.com --role owner    # the first account
```

Then register the Paystack webhook at `https://pieceofseda.com/api/paystack/webhook`.
It belongs on the **shop's** hostname, not the admin's: the API routes are excluded
from the rewrite and Paystack has no reason to know the panel exists.
