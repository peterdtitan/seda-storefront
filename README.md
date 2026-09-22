# Șèdá Storefront

Public storefront for **Șèdá** (Yoruba: *to create*) — a Lagos label making contemporary
Adire garments. Next.js App Router + TypeScript, content in Sanity, deployed on Vercel.

Design direction: **Option A, "Editorial Oxblood"** — full-bleed photography, oxblood
colour floods, asymmetric display serif. The spec, tokens and screen-by-screen
measurements live in the handoff bundle at
`../Șèdá Design System/design_handoff_seda_storefront/`. `BUILD_PLAN.md` there is the
commit-by-commit working agreement for this repo; read it before adding anything.

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

| Variable | Where it comes from | Secret |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | sanity.io/manage → Project settings | no |
| `NEXT_PUBLIC_SANITY_DATASET` | usually `production` | no |
| `NEXT_PUBLIC_SANITY_API_VERSION` | pinned date, e.g. `2026-09-22` | no |
| `SANITY_API_READ_TOKEN` | Project settings → API → Tokens, **Viewer** scope | **yes** |

`.env*` is gitignored; only `.env.local.example` is committed.

## First-time service setup

These two steps need your own logins and are not scripted:

```bash
# 1. Sanity — creates the project + dataset, prints the project ID
pnpm dlx sanity@latest login
pnpm dlx sanity@latest init --create-project "Seda Storefront" --dataset production

# 2. Vercel — links this directory to a Vercel project
pnpm dlx vercel@latest link
pnpm dlx vercel@latest env add NEXT_PUBLIC_SANITY_PROJECT_ID
# …repeat for each variable in the table above
```

In Sanity **Project settings → API → CORS origins**, add `http://localhost:3000` and the
Vercel production/preview domains with credentials allowed, or the embedded Studio will
refuse to authenticate.

On Vercel, set the project's Node.js version to **24.x** to match `.nvmrc`.

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | production build — must pass before any commit |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check |

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

**When the licensed files arrive:** drop the `.woff2` into `src/app/fonts/`, swap the
`next/font/google` call for `next/font/local` keeping the same `variable` name, and
delete the dash patch described below. Nothing else changes.

> **Known substitution artefact.** Bodoni Moda's Google subset declares unicode-range
> `U+2000-206F` but ships no en or em dash glyph, so the browser draws a blank and never
> falls back. Display-type copy uses an em dash (`Look 01 — Resist Set`), so
> `typography.css` redirects those two codepoints to a system serif via a scoped
> `@font-face`. Delete it with the substitution and confirm on
> `/styleguide → Glyph coverage`.

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

## What is not here yet

Schemas and seed content, and every page. The layout shell (header, footer, shared
primitives) lands next.
