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

Schemas and seed content (commit 3), the token port (commit 2), and every page (commits
5–11). This commit is the scaffold only: it builds, deploys and authenticates, and does
nothing else.
