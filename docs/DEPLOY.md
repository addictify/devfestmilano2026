# Deploying

Two pieces, deployed independently:

| Piece | Where | What it is |
|---|---|---|
| Frontend | **GitHub Pages** | Static export of the Next app, including `/admin` |
| API | **Cloud Functions for Firebase (2nd gen)** | The `src/app/api` route handlers, bundled into one function |

The API needs a server because it holds the Firestore Admin SDK, the auth
guards, and the QR secrets. Everything else is static, so Pages serves it.

## Why the API routes aren't duplicated

`functions/` does **not** reimplement the endpoints. `functions/build.mjs`
bundles the very same `src/app/api/**/route.ts` handlers, swapping three
Next-only imports:

- `server-only` → an empty module (it exists to make Next's bundler fail on a
  client import; meaningless server-side),
- `next/server` → a tiny `NextResponse` shim over the standard `Response`,
- `next/cache` → `revalidatePath` becomes "ask GitHub Actions to rebuild",
  because a static site has no ISR cache to invalidate.

So every rule about who may do what lives in exactly one place. Adding a route
means adding one line to `ROUTES` in `functions/src/index.ts`.

## Credentials: none to manage

Inside Cloud Functions the Admin SDK uses Application Default Credentials, so
`FIREBASE_ADMIN_PRIVATE_KEY` and friends are **not needed there** — one fewer
secret to store and rotate. `src/lib/firebase/admin.ts` detects the runtime
(`K_SERVICE`) and picks ADC there, explicit credentials locally.

## Deploying the API

Automatic: `.github/workflows/functions.yml` deploys on pushes that touch
`functions/`, `src/app/api/`, `src/lib/`, `src/types/` or `firebase.json` — a
copy change doesn't redeploy the backend. Manually:

```bash
firebase deploy --only functions --force
```

CI authenticates with **Workload Identity Federation**, so no service-account
key is stored in GitHub: Actions presents a short-lived OIDC token, and the
provider only accepts tokens from this repository. The pieces (already created)
are the `github` pool + OIDC provider and the `github-deployer` service account.

The live function is `api` in `europe-west1`, reachable at both
`https://europe-west1-devfestmilano26.cloudfunctions.net/api` (stable — this is
what `NEXT_PUBLIC_API_BASE_URL` uses) and a hashed `*.run.app` URL that changes
if the function is recreated.

Two things that are easy to trip over, both already handled:

- **functions/ uses npm, not pnpm.** pnpm 10 refuses to run dependency build
  scripts unless they're allow-listed, and in Cloud Build that refusal fails the
  deploy outright. `package-lock.json` must stay committed.
- **2nd-gen functions run on Cloud Run, which is private by default.** Without
  `roles/run.invoker` for `allUsers`, every request — including CORS preflights
  — returns 403 before reaching any code. Authorization is done in the handlers
  via Firebase ID tokens, so the endpoint itself has to be reachable.

One secret is required, and only for rebuilds:

```bash
printf '%s' 'ghp_yourtoken' | gcloud secrets versions add GITHUB_REBUILD_TOKEN --data-file=- --project devfestmilano26
```

A GitHub fine-grained PAT with **Actions: read and write** on this repo. It's
currently seeded with the literal string `unset`, because Secret Manager won't
accept an empty payload but the function has to deploy before a real token
exists; `publishSite()` treats that value as "not configured", so the Pubblica
button reports it cleanly instead of attempting a dispatch that 401s.
Everything else works without it.

## Deploying the frontend

Automatic: `.github/workflows/deploy-pages.yml` builds and publishes on every
push to `main`, and on `workflow_dispatch` (what the Pubblica button fires).

Set these as **repository variables** (Settings → Secrets and variables →
Actions → Variables). They're `NEXT_PUBLIC_*`, so they're inlined into the
client bundle and public by construction — not secrets:

- `NEXT_PUBLIC_API_BASE_URL` ← the deployed function URL
- `NEXT_PUBLIC_SITE_URL` → `https://2026.devfestmilano.it`
- `NEXT_PUBLIC_FIREBASE_*` (six values, same as `.env`)
- `NEXT_PUBLIC_TICKETS_URL`, `NEXT_PUBLIC_CFP_URL`

The workflow refuses to publish if a service-account key ever appears in `out/`.

Then point the domain: Pages → Custom domain → `2026.devfestmilano.it`
(`public/CNAME` already carries it), and a DNS CNAME to `addictify.github.io`.

## Content updates: edit freely, publish once

Published content is baked at build time, so a Firestore change is invisible
until the site is rebuilt. Edits do **not** rebuild on their own — an organizer
usually changes several things in a row, and a rebuild per save would waste
minutes of CI and leave the public site mid-update.

Instead, each edit marks the site as having unpublished changes (recorded in
Firestore at `config/publish`, since function instances don't survive between
requests). A banner across the top of `/admin` shows how many are waiting and
what they touched, and **Pubblica sito** fires the `workflow_dispatch`. The site
goes live a couple of minutes later.

If publishing fails — most often a missing `GITHUB_REBUILD_TOKEN` — the pending
state is deliberately left alone, so the banner keeps showing that the live site
is behind rather than quietly claiming it's current.

## Firestore and Storage rules

Independent of all the above:

```bash
firebase deploy --only firestore:rules,storage
```

`.firebaserc` pins the project, so no `--project` flag. These rules are what
stop anonymous clients reading `subscribers`, `checkpoints` and `gameProfiles`
with the public web API key.

## Running it all locally

```bash
PORT=3100 pnpm dev              # full Next app, API included, same-origin
pnpm --dir functions build && firebase emulators:start --only functions
```

With `NEXT_PUBLIC_API_BASE_URL` empty, the dev server serves its own API — the
functions emulator is only needed when testing the deployed shape.
