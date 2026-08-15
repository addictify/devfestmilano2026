# DevFest Milano 2026 — Project status

Status snapshot kept **in the repo** (so it's available on any machine, unlike
Claude's local memory which lives in `~/.claude/` and is not committed).

Event: **10 October 2026**. Co-organized by **GDG Cloud Milano** (Cloud · AI · DevOps)
and **GDG Milano** (Android · Web · AI). Venue: **Randstad Box**, Via San Vigilio 5,
20142 Milano (Famagosta · M2).

## Stack
Next.js 16 (App Router, Turbopack) · Tailwind v4 · Firebase (Firestore/Auth/Admin) ·
next-intl (IT/EN, `proxy.ts`) · Motion · Sessionize (talks/CFP) · Bevy (tickets) ·
deploy Vercel (frontend) + Firebase (backend).

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
  Still to do:
  - **Enable Firebase Authentication** — currently returns
    `auth/configuration-not-found`, i.e. no sign-in provider is turned on yet.
    Console → Authentication → Sign-in method → enable **Google**. Without it,
    login, My Schedule, `/admin` and DevFest Quest can't work.
  - `firebase deploy --only firestore:rules` (rules are written, not deployed —
    Firestore is currently on its default rules).
  - Deploy to Vercel, set the same env vars there, add the prod domains to
    Firebase Auth's authorized domains.
- **After talk selection:** set `speakersPublished` / `schedulePublished` to
  `true` and run the Sessionize sync (`cfpOpen` is already `false` — the site
  shows the "selection in progress" state).
- **Content to replace:** official sponsor logos (current are placeholder SVG
  wordmarks in `public/images/sponsors/`), team photos, real past-event
  numbers.
- **Go-live for admin/favorites:** these need a live Firebase project to function
  (signed-out / absent without it). After configuring, grant the first admin with
  `pnpm set-admin <email>` and re-sign-in.
- **Admin still open:** news CRUD (intentionally skipped); image upload to Storage
  (admin uses pasted URLs for now).
- **Offline:** the app SHELL ships (Batch 1); full offline content caching is open.
- **DevFest Quest ops:** generate + print the checkpoint QR codes from
  `/admin/checkpoints` and place them physically at the venue before the event
  (the only non-code step). Camera scanning needs HTTPS (Vercel — fine).
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
