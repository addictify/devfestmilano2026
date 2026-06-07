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

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |

## How content flows

```
Sessionize  ──(/api/sync, hourly Vercel Cron)──▶  Firestore  ──(Admin SDK)──▶  Next.js (ISR)
   talks, speakers, schedule                     speakers/sessions/tracks      pages
admin (sponsors/news/config) ─────────────────────────▶  Firestore
```

- `src/lib/data/content.ts` reads from Firestore when the Admin SDK is configured, **otherwise returns seed content**.
- `POST|GET /api/sync` — pulls Sessionize → Firestore, then revalidates ISR. Protected by `CRON_SECRET` (Vercel Cron) or `?secret=REVALIDATE_SECRET`.
- `POST /api/revalidate?secret=…` — on-demand ISR refresh after editing content.

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
- **Phase 2** — Google Sign-In + "My Schedule" favorites (Firestore sync), PWA offline, add-to-calendar. Firestore rules for `users/**` are already in place.
- **Phase 3** — gamification (QR scavenger hunt, points, badges, leaderboard) + live session feedback with an organizer dashboard.

## What you need to provide

1. **Firebase project** → fill `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_ADMIN_*` in `.env.local` (+ Vercel env).
2. **Sessionize event id** → `SESSIONIZE_EVENT_ID`; the CFP/talks then sync automatically.
3. **Bevy event URL** → `NEXT_PUBLIC_TICKETS_URL` (or edit `src/lib/site.ts`).
4. Brand assets, past-edition photos, venue details, sponsor logos, real team list.
5. Secrets: `REVALIDATE_SECRET`, `CRON_SECRET`.

## Deployment

- **Frontend** → Vercel (set all env vars; the hourly Sessionize sync runs via `vercel.json` Cron).
- **Backend** → Firebase: `firebase deploy --only firestore:rules`. Add your Vercel domains to Firebase Auth → Authorized domains.
- Grant an organizer admin access with a custom claim `{ admin: true }` (Phase 2/3 admin).

---

DevFest Milano is an independent, community-run event. Google and the Google logo are not affiliated with and do not sponsor the event.
