# Șèdá Storefront

Public storefront for **Șèdá** (Yoruba: *to create*) — a Lagos label making contemporary
Adire garments. Next.js App Router + TypeScript, content in Sanity, deployed on Vercel.

## Requirements

- Node **24.x** (`.nvmrc`; `nvm use`)
- pnpm (`corepack enable pnpm`)

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # then fill in the Sanity values
pnpm dev
```

- Storefront: http://localhost:3000
- Sanity Studio: http://localhost:3000/studio

## Environment variables

Every variable below must be set in `.env.local` locally and in the Vercel project
(Production, Preview and Development). The app throws at boot if one is missing rather
than rendering empty content.


> A token created without a **role** authenticates but cannot read data — the query
> API answers `project user not found`. Public reads still work, so the storefront
> looks fine and only draft previews break.


## Scripts

| Script | Does |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | production build — must pass before any commit |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check |

## Content

Schemas live in `src/sanity/schemaTypes/`. Four documents — `product`, `look`,
`category`, `siteCopy` — and three objects — `colourway`, `sizeStock`, `productImage`.

### How the catalogue is modelled

A **product is a garment**, and a **colourway is an object inside it** carrying that
colour's swatch hex, photography and per-size stock. "Teal Adire" on the cargos and
"Teal Adire" on a future shirt are different cloth, cut and inventory, so a colourway
is never shared between products.

**The shop grid renders one card per product-colourway.** That is why the design's
eight cards come from six garments — three of them are The Dart Cargos in teal, coral
and indigo.

**Sold out is derived, not a flag**: a colourway is sold out when every size row is
zero. The product page's low-stock notice (`Only 4 left in Teal Adire, M.`) reads the
real count.

**Prices are integers in kobo.** ₦48,000 is stored as `4800000`. `src/lib/money.ts`
formats at the edge. A display string cannot be summed, compared, or handed to
Paystack, and it silently encodes a locale.

**Alt text is a required field** on every image unless explicitly marked decorative.
The design reference omits alt text entirely; a required field is the only way it
actually gets written.

**Site copy is a singleton** at the fixed id `siteCopy`, pinned in the Studio structure
so a second one cannot be created.

> **Document ids use hyphens, never dots.** Sanity reads a dot in an `_id` as a path
> prefix, and such documents are invisible to unauthenticated reads — the storefront
> would render an empty shop with no error anywhere.

### Seeding

```bash
pnpm seed
```

Wraps `sanity exec scripts/seed.ts --with-user-token`, so it uses your Sanity CLI login
rather than a token — no write token needs to exist.

It is idempotent: fixed document ids with `createOrReplace`, and each photograph
uploaded once under a deterministic label and reused afterwards. Re-running overwrites
seed content and leaves anything added since. It never deletes; to start clean,
`pnpm dlx sanity dataset delete production`.

Photography is read from the handoff bundle, not this repo — the spec keeps images in
the CMS and only the logos in git. Point `SEDA_ASSETS_DIR` elsewhere if the bundle is
not a sibling of this directory.

## Design tokens

`src/styles/tokens/` mirrors `design_reference/tokens/` one file to one file, so an
upstream token edit re-ports as a plain copy.

| File | Origin |
|---|---|
| `colors.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css` | **byte-identical** copies of the design system — listed in `.prettierignore` so formatting never introduces phantom diffs |
| `typography.css` | ported, with the three family stacks rewired to next/font variables |
| `base.css` | ported element defaults |
| `recipes.css` | authored here — the four `disp / eyebrow / brandBody / uiLabel` recipes as classes |

**Consume the semantic alias, never the raw hex.** `--text-heading`, not
`--seda-oxblood`. For an oxblood or ink band, set `data-theme="oxblood"` /
`data-theme="ink"` on the section and let the whole semantic set flip, rather than
hand-inverting colours.

The recipe classes take their per-instance knobs as custom properties, because that is
the only thing the design varies:

```tsx
<div className="seda-disp" style={{ "--disp-size": "44px" }}>New this drop</div>
<p className="seda-brand-body" style={{ "--brand-body-max": "46ch" }}>…</p>
```

### /styleguide

Every token rendered as a ramp — colour, inverse scopes, type roles, glyph coverage,
spacing, radius, elevation, scrims, motion. **Development only**; the production build
404s it. Check it after any token change: if a ramp looks wrong, the token file is wrong.

### Fonts

`src/styles/fonts.ts` is the only file in the repo that names a concrete typeface. It
registers three faces via `next/font` and exposes `--font-display-face`,
`--font-brand-face` and `--font-ui-face`; `typography.css` builds the stacks from those
and never mentions a family.

- **Display** — Hatton *(substituted: Bodoni Moda)*
- **Brand** — Kingred Modern *(substituted: Poiret One)*
- **UI** — Jost, real, not a substitution

## Layout

Two route groups sit under `src/app/`:

- `(storefront)` — header, footer and the page shell. Its layout fetches the footer
  tagline from `siteCopy`.
- `(studio)` — the embedded Sanity Studio, deliberately outside the storefront chrome.

The root layout stays bare: `<html>`, `<body>` and the font variables, nothing else.

**Responsive is CSS, not JavaScript.** The design reference switches layouts on a
`mobile` boolean; here both the desktop and mobile headers render and a media query at
**768px** picks one, so the server and the client agree on the first paint. There is no
`useMediaQuery` anywhere and there should not be.

Shared parts live in `src/components/ui/` — `Cta`, `Outline`, `Swatches`, `Sizes`,
`Rule`, `Scrim`, `Logo`, and the `Eyebrow / Display / BrandBody / UiLabel` text
wrappers over the token recipes. `Cta` and `Outline` render an `<a>` when given `href`
and a `<button>` otherwise. All of them are on `/styleguide` under **Primitives**.

`SanityImage` wraps `next/image`: it reads width, height and the lqip blur from the
dereferenced asset, so images reserve their box instead of shifting. Use the
`IMAGE_FRAGMENT` in `src/sanity/lib/queries.ts` for every image projection or that
metadata will be missing.

## Why the build must not need the CMS

`src/sanity/env.ts` used to throw on a missing variable. Next evaluates that module
while collecting page data, so the throw killed the entire build before one route
rendered — a Vercel preview died with nothing but a stack trace.

Configuration now degrades instead:

- `dataset` defaults to `production`, `apiVersion` to the pinned date.
- A missing `projectId` leaves `client` null and logs an error naming the variable.
- Every read goes through `sanityFetch`, which returns `null` on an unconfigured or
  unreachable CMS. Callers fall back.

CI runs `pnpm build` **with no Sanity variables set** for exactly this reason. A build
that needs them to compile is a build that breaks on every fork and every fresh clone.

## Repo conventions

- **Branch per step.** One branch, one commit, one PR per numbered step in `BUILD_PLAN.md`.
  Branch names follow the commit type: `chore/scaffold`, `style/design-tokens`,
  `feat/home-page`, and so on.
- **Conventional Commits**, imperative mood, one line plus a body when the step made a
  non-obvious choice.
- **Every commit builds.** `pnpm build` passes before the commit is made.
- **No design system utility-class framework.** Styling is CSS Modules over the design
  system's custom properties. A Tailwind config duplicating the tokens is a maintenance
  trap and was ruled out deliberately.
- **Photography goes in the CMS**, not `/public`. Only the logos are committed.
