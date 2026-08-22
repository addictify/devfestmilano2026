# DevFest Milano 2026

Official website for **DevFest Milano 2026** — the GDG Milano community conference on **10 October 2026**.

Built with Next.js 16 (App Router) + Firebase, bilingual 🇮🇹 / 🇬🇧, with a distinctive GDG four-color design. Speakers and agenda are powered by Sessionize; tickets by Bevy.

> **Runs with zero config.** Without any environment variables the site renders fully from bundled seed content (`src/lib/data/seed.ts`). Wire Firebase + Sessionize to switch to live data — the UI doesn't change.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — ISR, static generation
- **Tailwind CSS v4** + Radix primitives + **Motion** (animations)
- **next-intl** — IT/EN locale routing (`/it`, `/en`)
- **Firebase** — Firestore (content), Auth (Google Sign-In, Phase 2), Admin SDK (server reads + sync)
- **Sessionize** — Call for Papers, talks, speakers (synced into Firestore)
- **Bevy** — ticketing / registration (external)
- Deploy: **Vercel** (frontend + ISR + Cron) · **Firebase** (backend)

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000  (redirects to /it)
```

Optional, to use live data:

```bash
cp .env.example .env.local   # fill in Firebase + Sessionize values
```

Or run the production build in Docker — see [docs/DOCKER.md](docs/DOCKER.md):

```bash
docker compose up --build    # http://localhost:3100
```

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm set-admin <email>` | Grant a user the admin custom claim (needs `FIREBASE_ADMIN_*`) |

## How content flows

```
Sessionize  ──(/api/sync, hourly Vercel Cron)──▶  Firestore  ──(Admin SDK)──▶  Next.js (ISR)
   talks, speakers, schedule                     speakers/sessions/tracks      pages
admin (sponsors/news/config) ─────────────────────────▶  Firestore
```

- `src/lib/data/content.ts` reads from Firestore when the Admin SDK is configured, **otherwise returns seed content**.
- `POST|GET /api/sync` — pulls Sessionize → Firestore, then revalidates ISR. Protected by `CRON_SECRET` (Vercel Cron) or `?secret=REVALIDATE_SECRET`.
- `POST /api/revalidate?secret=…` — on-demand ISR refresh after editing content.

## Admin

IT-only, claim-gated panel at `/admin` for organizers.

1. **Grant access:** `pnpm set-admin you@example.com` (requires `FIREBASE_ADMIN_*`). Sets the `{ admin: true }` custom claim on that Google account. **Sign out and back in** for the claim to take effect.
2. **Sign in** at `/admin` with that account (header avatar menu → sign in). Non-admins see "access denied"; signed-out users get a sign-in prompt.
3. **Sections:** Cruscotto (dashboard: feedback + game stats), Checkpoint (DevFest Quest QR checkpoints — printable QR + optional quiz), Badge (CRUD), Sponsor (CRUD), Team (CRUD), Iscritti (read-only + CSV export of notify-me subscribers), Configurazione (toggle `ticketsAvailable` / `speakersPublished` / `schedulePublished` / `cfpOpen` at runtime).
4. **Images** (sponsor logos, team photos) are pasted URLs — host them anywhere allowed in `next.config.ts` `remotePatterns` (Firebase Storage / googleusercontent).
5. **Writes** go through claim-gated `/api/admin/*` routes (Admin SDK + ID-token verification); config toggles write Firestore `config/site` and revalidate the affected public pages. Admin requires a server → it is absent on the static-export (GitHub Pages) build.

## Project structure

```
src/
  app/[locale]/        landing + speakers, agenda, sponsors, team, venue, cfp, faq, code-of-conduct
  app/api/             sync (Sessionize→Firestore), revalidate
  components/          layout · sections (landing) · speakers · agenda · sponsors · common · ui
  i18n/                routing · request · navigation   (next-intl)
  lib/                 data (content + seed) · firebase (client/admin) · sessionize · design · site · time
  proxy.ts             locale negotiation (Next 16 renamed middleware → proxy)
messages/              it.json · en.json   (UI strings)
firebase/              firestore.rules · indexes
```

## Phased delivery

- **Phase 1 (this site)** — landing, speaker directory, multi-track agenda with filters, CFP (Sessionize), tickets (Bevy), sponsors, team, venue, FAQ, Code of Conduct. Bilingual, dark mode, SEO.
- **Phase 2 (done)** — Google Sign-In + "My Schedule" favorites (localStorage → Firestore, merge on sign-in), add-to-calendar, installable PWA with offline shell, and an IT-only admin (`/admin`).
- **Phase 3 (done)** — **DevFest Quest**: organizers define QR checkpoints (each worth points, optionally a badge, and an optional quiz that adds/multiplies points or penalises a wrong answer) + badges in `/admin`; attendees sign in, open the in-app camera scanner at `/play`, scan checkpoints to earn server-awarded points/badges, and appear on an opt-in leaderboard. Plus per-session **live feedback** (1–5★ + comment, one per user) and an organizer **dashboard** aggregating feedback + game stats. Game state is server-authoritative (`gameProfiles`, write-locked to the Admin SDK).

## What you need to provide

1. **Firebase project** → fill `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_ADMIN_*` in `.env.local` (+ Vercel env).
2. **Sessionize event id** → `SESSIONIZE_EVENT_ID`; the CFP/talks then sync automatically.
3. **Bevy event URL** → `NEXT_PUBLIC_TICKETS_URL` (or edit `src/lib/site.ts`).
4. Brand assets, past-edition photos, venue details, sponsor logos, real team list.
5. Secrets: `REVALIDATE_SECRET`, `CRON_SECRET`.

## Deployment

Everything runs on Firebase — see **[docs/DEPLOY.md](docs/DEPLOY.md)** for the
full procedure.

- **App** → Firebase App Hosting (`apphosting.yaml`). Needs the Blaze plan: the
  app is server-rendered, so it runs on Cloud Run.
- **Rules** → `firebase deploy --only firestore:rules` (independent of the plan).
- **Hourly Sessionize sync** → Cloud Scheduler hitting `/api/sync` with
  `Authorization: Bearer $CRON_SECRET`. This used to be a `vercel.json` cron;
  see DEPLOY.md for the `gcloud scheduler` command.
- Add the live domain to Firebase Auth → Authorized domains, or Google sign-in
  fails there.
- Grant an organizer admin access: `pnpm set-admin <email>` (see [Admin](#admin)).

---

DevFest Milano is an independent, community-run event. Google and the Google logo are not affiliated with and do not sponsor the event.
