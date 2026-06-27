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
CFP is open, so there's no real lineup yet. These gate the UI:
- `ticketsAvailable: false` → ticket CTAs render disabled ("Tickets — soon").
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

## ⏳ Pending / next steps
- **Go-live config:** create Firebase project → fill `NEXT_PUBLIC_FIREBASE_*` +
  `FIREBASE_ADMIN_*`; set `SESSIONIZE_EVENT_ID`, Bevy URL, `REVALIDATE_SECRET`,
  `CRON_SECRET`. Deploy to Vercel; `firebase deploy --only firestore:rules`;
  add prod domains to Firebase Auth.
- **When CFP closes:** set `speakersPublished` / `schedulePublished` to `true`
  and run the Sessionize sync.
- **Content to replace:** official sponsor logos (current are placeholder SVG
  wordmarks in `public/images/sponsors/`), team photos, real past-event
  numbers, and `ticketsAvailable: true` when Bevy opens.
- **Not built yet:** lightweight admin (sponsors/news CRUD, claim-gated). Note a
  `subscribers` collection now exists (notify-me emails, admin-read) — export it
  manually until an admin UI lands in Batch 2.
- **Phase 2 (Batch 2):** Google Sign-In UI + "My Schedule" favorites
  (`users/{uid}/favorites`, rules present); offline SHELL already shipped in
  Batch 1, full offline content caching is still open.
- **Phase 3:** gamification (QR scavenger hunt, points, badges, leaderboard) +
  live session feedback + organizer dashboard.

## Run locally
```bash
pnpm install
PORT=3100 pnpm dev   # open http://localhost:3100  (port 3000 may be taken)
```
