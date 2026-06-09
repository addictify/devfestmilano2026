# Static export for GitHub Pages — design

**Date:** 2026-06-09
**Goal:** Produce a fully static export of the DevFest Milano 2026 frontend that
deploys to **GitHub Pages** on the custom domain **`devfest.gdgmilano.it`**,
**without breaking** the existing Next.js server build (so a future Vercel/server
deploy stays possible). Seed-bundled data only; no Firebase at build time.

## Context

- Next.js 16 (App Router) + Tailwind v4 + next-intl (IT/EN). Repo:
  `DaveThe/devfestmilano2026`.
- The site is already mostly static: every page uses `export const revalidate`
  (ISR), there are no Server Actions, `generateStaticParams` exists for locales
  and speaker detail, and the data layer falls back to bundled seed with zero env
  vars.
- The only genuinely server-side code is two route handlers
  (`src/app/api/sync`, `src/app/api/revalidate`) and the i18n `proxy.ts`.
- Client-side Firebase (`useAuth`, future "My Schedule") is unaffected by static
  export — it runs in the browser against Firebase, not a Next server.

## Verified constraints (from `node_modules/next/dist/docs/.../static-exports.md`)

`output: 'export'` does **not** support, and will **error** on:
- Route Handlers that read the request → **`/api/*` must be excluded.**
- Incremental Static Regeneration → **`export const revalidate` must be neutralized.**
- Proxy (renamed middleware) → **`proxy.ts` must be excluded.**
- `redirect()` config + default image loader → handled below.

These dictate the implementation: we cannot just flip `output: export`; we must
remove/neutralize the unsupported pieces **only in the static build**, leaving the
normal build untouched.

## Architecture

A single env flag, `STATIC_EXPORT=1`, switches the build into export mode. The
normal build (no flag) is byte-for-byte unchanged.

```
STATIC_EXPORT=1 pnpm build:static
   │
   ├─ scripts/static-build.sh
   │    1. move src/app/api      → .static-build-stash/api      (out of the tree)
   │    2. move src/proxy.ts     → .static-build-stash/proxy.ts
   │    3. neutralize `export const revalidate = …` in src/app/**  (in place, restored after)
   │    4. STATIC_EXPORT=1 next build   → emits ./out
   │    5. ALWAYS restore stashed files + revalidate lines (trap EXIT)
   │
   └─ out/  →  GitHub Action → GitHub Pages (devfest.gdgmilano.it)
```

The stash-and-restore is wrapped in a shell `trap … EXIT` so the working tree is
**always** restored, even if the build fails. Nothing is deleted from the repo.

## Components

### 1. `next.config.ts` — conditional export
Read `const isStaticExport = process.env.STATIC_EXPORT === "1";`. When true, add:
- `output: "export"`
- `images: { unoptimized: true }` (default optimizer is server-side)
- `trailingSlash: true` (so `/it` → `/it/index.html`; clean serving on Pages)

The existing `images.remotePatterns` and `withNextIntl` wrapper stay. When the
flag is absent, the config is identical to today.

### 2. `scripts/static-build.sh` — orchestration
POSIX `sh`/`bash` script, `set -euo pipefail`, `trap restore EXIT`:
- Stash `src/app/api` and `src/proxy.ts` to a gitignored `.static-build-stash/`.
- Comment out `export const revalidate = …` lines under `src/app/**` (revalidate
  is ISR → unsupported). Use a reversible transform (sed to a marker, restore on
  exit).
- Run `next build`.
- Restore everything on exit.

`.static-build-stash/` is added to `.gitignore`.

### 3. Root redirect `/` → `/it`
`proxy.ts` (which redirects `/` → `/it`) does not run on Pages. We need a static
`out/index.html` that bounces to `/it`.

**Approach (revised during implementation):** rather than add a root
`src/app/page.tsx` + `src/app/layout.tsx` — which would conflict with the
`<html>` already rendered by `[locale]/layout.tsx` and force a multi-root-layout
restructure of the working tree (Next.js route-groups rule) — the redirect is a
**static-export concern**, so the build script writes `out/index.html` directly
after `next build`. It contains `<meta http-equiv="refresh" content="0;url=/it/">`,
a `<script>location.replace("/it/")</script>` fallback, and a plain
`<a href="/it/">` for no-JS. The app tree stays 100% untouched, and the normal
server build keeps using `proxy.ts` for `/` → `/it`.

Next emits its own `out/404.html` from the existing `not-found`, which Pages
serves for unknown paths.

### 4. `public/CNAME` — custom domain
File containing `devfest.gdgmilano.it`. Pages serves on the custom domain, so **no
`basePath`/`assetPrefix`** is needed and URLs stay clean. (DNS: a `CNAME` record
for `devfest` → `davethe.github.io`, documented but outside this repo.)

### 5. `.github/workflows/pages.yml` — CI
Trigger: **push to `main`**. Permissions `pages: write`, `id-token: write`.
Steps: checkout → setup pnpm + Node 20 → `pnpm install --frozen-lockfile` →
`pnpm build:static` → `actions/upload-pages-artifact` with `path: out` →
`actions/deploy-pages`. Concurrency group so overlapping pushes don't race.

### 6. `package.json` — script
`"build:static": "STATIC_EXPORT=1 bash scripts/static-build.sh"`. Runnable locally
to verify `out/` before pushing.

## What does NOT change
- `pnpm build`, `pnpm dev`, `pnpm start`: identical behavior.
- All pages, i18n IT/EN, seed data, dark mode, SEO (sitemap/robots/metadata).
- `src/app/api/*` and `src/proxy.ts` stay in the repo, untouched, for a future
  server deploy.
- Client Firebase (`useAuth`, future My Schedule): already browser-side.

## What we lose (expected, accepted)
- ISR / on-demand revalidate → replaced by rebuild on push to `main`.
- `/api/sync` (Sessionize→Firestore) and `/api/revalidate` are absent from the
  Pages build. When live data is needed later, sync moves to a scheduled GitHub
  Action or a Firebase Cloud Function (out of scope here).

## Testing / verification
Run `pnpm build:static` locally and confirm:
- Exit code 0; no "ISR/route handler/proxy not supported" errors.
- `out/` contains `index.html` (redirects to `/it`), `it/` and `en/` trees,
  `404.html`, `CNAME`, and hashed `_next/static` assets.
- `src/app/api/` and `src/proxy.ts` are restored in the working tree afterward
  (git status clean for those paths).
- `pnpm build` (no flag) still succeeds unchanged.

## Out of scope
- Firebase project setup / live data sync.
- My Schedule, PWA, gamification (future phases; compatible with this architecture
  but built separately).
- DNS configuration (documented, done in the domain registrar).
