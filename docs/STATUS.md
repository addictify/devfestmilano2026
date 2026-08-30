# DevFest Milano 2026 — Project status

Status snapshot kept **in the repo** (so it's available on any machine, unlike
Claude's local memory which lives in `~/.claude/` and is not committed).

Event: **10 October 2026**. Co-organized by **GDG Cloud Milano** (Cloud · AI · DevOps)
and **GDG Milano** (Android · Web · AI). Venue: **Randstad Box**, Via San Vigilio 5,
20142 Milano (Famagosta · M2).

## Stack
Next.js 16 (App Router, Turbopack) · Tailwind v4 · Firebase (Firestore/Auth/Admin) ·
next-intl (IT/EN, `proxy.ts`) · Motion · Sessionize (talks/CFP) · Bevy (tickets) ·
deploy Firebase App Hosting (see `docs/DEPLOY.md`).

## Feature flags — `src/lib/site.ts`
Submissions closed 31 Jul 2026; talks are being selected, so there's no lineup
yet. These gate the UI (all four also overridable from `config/site` in
Firestore via `/admin/config`, no redeploy needed):
- `ticketsAvailable: true` → registration is **open** on Bevy: ticket CTAs link
  to the GDG Cloud Milano co-host page (`siteConfig.ticketsUrl`), the footer
  column becomes a registration CTA, and each community card shows its own
  chapter link (`communities[].registrationUrl`). Set to `false` to bring back
  the disabled "Tickets — soon" CTAs + notify-me dialog.
- `cfpOpen: false` → every "submit a talk" CTA is replaced by the **selection
  in progress** state (hero status line, CFP section badge + "go to the
  agenda", speaker-archetypes CTA, FAQ answer, agenda coming-soon copy). No
  Sessionize link renders anywhere while this is false. Flip to `true` next
  edition to reopen the CFP with the same flow.
- `speakersPublished: false` → home/`/speakers` show **speaker archetypes**
  (Googlers, GDEs, industry pros, international) + 2025 stats + CFP CTA.
- `schedulePublished: false` → `/agenda` shows "coming soon".

Flip the last two to `true` (and wire Sessionize) to surface the real speaker
directory + multi-track agenda — the seed data already supports them.

## ✅ Done (Phase 1)
Landing (hero + countdown + Duomo motif, what-to-expect, speaker archetypes,
agenda preview, communities + past-event cards, past-editions marquee, CFP band,
sponsors, venue + map, FAQ); pages `/speakers` `/agenda` `/communities`
`/sponsors` `/team` `/venue` `/cfp` `/faq` `/code-of-conduct` + speaker detail +
404; dark mode; SEO (sitemap/robots/metadata, hreflang); bilingual IT/EN.
Data layer reads Firestore when configured else **bundled seed** (`src/lib/data/*`).
Sessionize sync (`/api/sync`) + ISR revalidate (`/api/revalidate`); Firestore
rules; `vercel.json` cron; `.env.example`; README. Auth provider scaffolded
(`useAuth`) — Google Sign-In wired, no login UI yet. Official DevFest "< >"
brackets logo (SVG, year-free) + favicon from the 2025 site.

Real content in place: team (Alessandro Persiano, Daniele Bonaldo · GDE,
Davide Tresoldi, Matteo Rocco), sponsors (Google, Datwave, Randstad Box),
venue, 2025 numbers (300 attendees · 20+ speakers · 20+ sessions · 3 tracks).

### ✅ Batch 1 (2026-06-27)
- **Add-to-calendar:** pure `src/lib/calendar.ts` (RFC 5545 ICS + Google
  Calendar URL, unit-tested with Vitest) + `AddToCalendar` dropdown. Event-level
  on the hero; per-session in `SessionCard` (renders only when a session has
  times — live on seed, dormant publicly until `schedulePublished`).
- **PWA:** `src/app/manifest.ts` + icons (`public/icons/`, upscaled from the
  192px brand source — swap in native 512px art later), `public/sw.js`
  (network-first navigations → cached `/offline`, SWR for static assets, never
  caches `/api`), prod-only `RegisterSW`. Works on Vercel and the static export.
- **Notify-me capture:** `/api/subscribe` writes to a Firestore `subscribers`
  collection via the Admin SDK (create-only client rule, admin-read);
  `NotifyTicketsDialog` now captures an email (honeypot + graceful 503 degrade
  in seed mode / static export) while keeping the follow-communities links.
- Test harness added: **Vitest** (`pnpm test`); calendar + email suites green.

### ✅ Batch 2 (2026-06-27)
- **Login UI:** `AuthButton` (header + mobile) consuming the existing `useAuth` —
  Google sign-in button + avatar dropdown (name/email, My Schedule link, sign
  out). Renders nothing when Firebase is unconfigured (seed / static export).
- **My Schedule favorites:** pure `src/lib/favorites.ts` (localStorage serialize +
  merge, unit-tested), `useFavorites` hook (localStorage when signed-out →
  Firestore `users/{uid}/favorites` when signed-in, merges local→cloud once on
  sign-in, optimistic + rollback), `FavoriteButton` star on `SessionCard`, and a
  `/my-schedule` page. Works localStorage-only with zero Firebase.
- **Admin** (`/admin`, IT-only, claim-gated): `pnpm set-admin <email>` grants the
  `{admin:true}` claim; `verifyAdmin` (Bearer ID token, unit-tested) guards every
  `/api/admin/*` route. Sections: sponsors CRUD, team CRUD, subscribers list + CSV
  export, and runtime config toggles. Toggles write Firestore `config/site`, which
  a new `getSiteSettings()` (server) + `SiteSettingsProvider` (client) feed back
  into the 4 feature-flag readers — so flags flip without a redeploy.
- Admin needs a server → it is stashed out of the static-export build
  (`scripts/static-build.sh`) and absent on GitHub Pages. New Vitest suites:
  favorites, csv, settings-merge, admin-guard (server-only stubbed for tests).

### ✅ Batch 3 (2026-06-28)
- **DevFest Quest (gamification):** admin defines **checkpoints** (`/admin/checkpoints`
  — points, optional badge, printable QR via `qrcode`, optional **quiz**: a question
  whose correct answer adds or multiplies points and whose wrong answer subtracts a
  penalty) + **badges** (`/admin/badges`, incl. milestone badges). Attendees sign in,
  scan checkpoints with an **in-app camera scanner** (`jsqr`, 2-phase for quizzes) at
  `/play`, earning **server-awarded** points/badges; opt-in **leaderboard**. The
  scanner reads `DFQ:{id}:{secret}`; the secret never leaves the server.
- **Live feedback:** `FeedbackForm` on each `SessionCard` (1–5★ + comment, one editable
  response per user/session) → `/api/feedback`. Anonymous to organizers.
- **Organizer dashboard** (`/admin/dashboard`, default admin landing): per-session
  feedback aggregates (anonymised), checkpoint scans, badge distribution, top
  leaderboard, subscriber count.
- **Security:** game state lives in `gameProfiles/{uid}` — owner-read, **client-write
  locked** (`write: if false`); points/badges/scans written only by the Admin SDK in
  `/api/scan` (idempotent transaction, token-validated). New `verifyUser` guard for
  player routes. New pure Vitest suites: gamification, feedback-stats, user-guard.
- New deps: `jsqr` (scan), `qrcode` (admin QR). `/play/*` degrades to signed-out on
  the static export; `/admin/*` + `/api/*` stripped there as before.

## ⏳ Pending / next steps
- **Go-live config:** Firebase project `devfestmilano26` exists and the local
  `.env` is filled in — client config, `FIREBASE_ADMIN_*`, `SESSIONIZE_EVENT_ID`,
  `REVALIDATE_SECRET`, `CRON_SECRET` all verified working (Firestore reads +
  writes confirmed end-to-end, both locally and from the Docker image).
  Firebase Authentication is **enabled**, Firestore rules are **deployed**
  (2026-08-15), and `2026.devfestmilano.it` is in Auth's authorized domains.
  `.firebaserc` pins the project, so `firebase deploy --only firestore:rules`
  needs no `--project`.

  `d.tresoldi5@gmail.com` is **already an admin** (claim provisioned ahead of
  first sign-in via `pnpm set-admin <email> --create`) and is the *bootstrap*
  admin: `/admin/admins` can add and remove other admins, but never that
  account, so there's always a way back in.

  The project is on **Blaze**, so App Hosting and Storage are both available.
  The five Secret Manager entries exist and match `.env` byte for byte.

  Still to do:
  - **Create the App Hosting backend** (`firebase apphosting:backends:create`)
    and connect it to the GitHub repo. It builds from a branch or commit on the
    *remote*, so the local commits have to be pushed first — otherwise the first
    rollout ships the pre-fix tree.
  - Run `firebase apphosting:secrets:grantaccess <secret> --backend <id>` for
    each of the five once the backend exists.
  - Run `firebase apphosting:secrets:grantaccess` for the five secrets once the
    backend exists.
  - Schedule the hourly Sessionize sync (`gcloud scheduler`, see DEPLOY.md) —
    this replaced the old `vercel.json` cron.
  - **Point `2026.devfestmilano.it` at the App Hosting backend** (custom domain
    + DNS records). It's authorized for sign-in and set as
    `NEXT_PUBLIC_SITE_URL`, but nothing serves it yet — the only live host is
    the unused default `devfestmilano26.web.app`.
- **After talk selection:** set `speakersPublished` / `schedulePublished` to
  `true` and run the Sessionize sync (`cfpOpen` is already `false` — the site
  shows the "selection in progress" state).
  - ⚠️ **`SESSIONIZE_EVENT_ID=24146` does not work**: `sessionize.com/api/v2/24146/view/All`
    returns 404 (checked 2026-08-22), as does the `devfest-milano-2026` slug,
    while the public CFP page itself is live. The v2 API needs the id of an
    *API endpoint* created in Sessionize (Event → Embed & API), which is a short
    alphanumeric code, not the numeric event id. Until that's created and put in
    `SESSIONIZE_EVENT_ID`, `/api/sync` will keep failing with 502.
- **Content to replace:** official sponsor logos (current are placeholder SVG
  wordmarks in `public/images/sponsors/`), team photos, real past-event
  numbers.
- **Dependencies:** clear. The 28 advisories (18 high) were resolved by bumping
  next/firebase/sharp and pinning seven transitive packages through
  `pnpm.overrides`; `pnpm audit` reports nothing.
- **Admin still open:** news CRUD (intentionally skipped). Image upload is
  **done** — Storage is provisioned (`devfestmilano26.firebasestorage.app`,
  europe-west3), `firebase/storage.rules` is deployed (public read on
  `images/**`, all client writes denied), and the sponsor/team forms upload
  through `POST /api/admin/upload`.
- **Offline:** done. The service worker (`devfest-v2`) keeps visited pages, so
  the agenda stays readable when signal drops at the venue; `/admin`,
  `/my-schedule` and `/play` are deliberately never cached.
- **DevFest Quest ops:** generate + print the checkpoint QR codes from
  `/admin/checkpoints` and place them physically at the venue before the event
  (the only non-code step) — the checkpoints and badges themselves also need
  defining in `/admin`. Camera scanning needs HTTPS, which App Hosting provides.
- **All three phases are now built.** Remaining work is go-live config + content,
  not features. Possible future polish: image upload to Storage, news/blog, richer
  anti-cheat, exporting game data.

## Run locally
```bash
pnpm install
PORT=3100 pnpm dev   # open http://localhost:3100  (port 3000 may be taken)
```

Or the production build in Docker (`docs/DOCKER.md`):
```bash
docker compose up --build   # http://localhost:3100
```
