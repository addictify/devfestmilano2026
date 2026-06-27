# Batch 1 — Add-to-Calendar · PWA · Notify-me capture

Design spec. Date: 2026-06-27. Status: approved-for-implementation pending user review.

Part of a phase-batched roadmap (one spec per feature/batch). Batch 1 = the three
now-safe features that need neither auth nor a published lineup. Batches 2 (login,
favorites, admin) and 3 (gamification, feedback, organizer dashboard) get their own
specs later.

## Goals

1. **Add-to-calendar** — let visitors add the DevFest day *and* individual sessions
   to Google Calendar or download an `.ics`. Event-level works today; session-level
   is wired now against seed data and stays mostly hidden until `schedulePublished`.
2. **PWA** — installable, themed, with an offline app-shell fallback. Native
   Next 16 / web APIs only; no `next-pwa`.
3. **Notify-me capture** — upgrade `NotifyTicketsDialog` to also store the email in
   a Firestore `subscribers` collection (we own the pre-sale list), while keeping
   the existing "follow both communities" nudge.

Non-goals: per-session calendar UI styling polish beyond a reusable button; push
notifications; background sync; email sending (export the list manually for now).

## Context / constraints (verified in code)

- Event times live in `siteConfig.eventDate` / `eventEnd` (ISO, +02:00).
- `Session.startsAt` / `endsAt` are `string | null` (null until schedule published),
  `roomName?`, `title`, `description: {it,en}`. Timezone is `Europe/Rome`.
- i18n: next-intl, messages at repo-root `messages/{it,en}.json`, locales `it`/`en`,
  prefix always. New copy goes in both files under new namespaces.
- `proxy.ts` matcher excludes `/api`, `_next`, `_vercel`, and any path with a dot.
  So `/manifest.webmanifest`, `/sw.js`, and `/api/*` are NOT locale-rewritten — safe.
- **Static-export mode exists** (`STATIC_EXPORT=1`, GitHub Pages). The notify-me
  write needs a server route → it only works on the Vercel/server build. On static
  export the API route is absent; the dialog must degrade to the current
  follow-communities-only behavior (no crash, no broken submit).
- Firestore rules already deny everything not explicitly allowed. We add a
  `subscribers` rule: create-only from clients, admin-read.
- Firestore may be unconfigured (seed mode). The notify API must no-op gracefully
  (return a friendly "saved" without throwing) when Admin SDK isn't configured, OR
  better: report "not available" and still show the follow nudge. See error handling.

---

## Feature 1 — Add-to-calendar

### Module: `src/lib/calendar.ts` (pure, no React, unit-testable)

```ts
export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  start: string;   // ISO 8601 with offset
  end: string;     // ISO 8601 with offset
  url?: string;
  uid?: string;    // stable id for the VEVENT; defaults to a slug of title+start
}

export function googleCalendarUrl(e: CalendarEvent): string;
export function buildIcs(e: CalendarEvent): string;            // single VEVENT VCALENDAR
export function icsDataUri(e: CalendarEvent): string;          // data:text/calendar;... for download
```

- **Google URL**: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=START/END&details=…&location=…`. Dates formatted UTC basic `YYYYMMDDTHHMMSSZ` (convert the +02:00 ISO to UTC).
- **ICS**: minimal valid VCALENDAR (VERSION:2.0, PRODID, one VEVENT with UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, URL). CRLF line endings, escape `,` `;` `\\` `\n` per RFC 5545. DTSTART/DTEND emitted as UTC `…Z`.
- `uid` stable so re-adding updates rather than duplicates.

### Component: `src/components/common/AddToCalendar.tsx` ("use client")

- Props: `event: CalendarEvent`, `size?`, `variant?`, `label?`.
- Renders a Radix `DropdownMenu` (`@radix-ui/react-dropdown-menu` is already a dep; there is no shared `ui/dropdown` primitive yet — `LanguageSwitcher.tsx` uses Radix dropdown inline, so either follow that inline pattern or extract a small `ui/dropdown-menu.tsx` styled wrapper as part of this work) with two items: **Google Calendar** (opens `googleCalendarUrl` in new tab) and **Download .ics** (anchor with `download` attr + `icsDataUri`, filename like `devfest-milano-2026.ics`).
- Calendar/clock icon (`lucide-react`, already used). Matches button styling used elsewhere.
- i18n namespace `calendar`: `add`, `google`, `ics`.

### Event-level usage
- A reusable `eventCalendarEvent()` helper builds the whole-day `CalendarEvent` from `siteConfig` (title `DevFest Milano 2026`, location = venue name + address, url = site, start/end = eventDate/eventEnd, description from a localized string).
- Placed on the Hero CTA cluster and/or the Venue section. One instance minimum on Hero.

### Session-level usage
- In `SessionCard.tsx`: when `startsAt && endsAt` (schedule published / seed has times) render an `AddToCalendar` built from the session (title, description in current locale, location = `roomName`, start/end, url = session/agenda anchor). When times are null, render nothing.
- Because `schedulePublished:false` keeps the real agenda hidden, this is dormant on the public site but fully working on seed/preview — exactly the requested behavior.

### Tests
- `calendar.test.ts`: golden ICS string (line endings + escaping), UTC date conversion (+02:00 → Z), Google URL param encoding, stable uid.

---

## Feature 2 — PWA

### Manifest: `src/app/manifest.ts` (Next 16 metadata route → serves `/manifest.webmanifest`)

- `name`, `short_name` from `siteConfig`. `start_url: "/"`, `display: "standalone"`, `background_color`/`theme_color` from GDG tokens (background + a brand color), `lang: "it"`, `dir: "ltr"`.
- `icons`: 192, 256, 512, and a 512 `maskable`. **New asset task**: generate PNG icons from the existing `< >` brackets logo into `public/icons/`. (List the exact files; if only an SVG exists, generate PNGs as part of impl.)
- `categories: ["events","technology"]`, `scope: "/"`.

### Metadata wiring (root layout `generateMetadata`)
- Add `manifest: "/manifest.webmanifest"`, `appleWebApp: { capable: true, title: shortName, statusBarStyle: "default" }`, `themeColor` (light/dark via media), and apple-touch-icon. Use Next's `Metadata` fields (don't hand-write `<link>` unless a field is missing).

### Service worker: `public/sw.js` + registration

- **SW file** lives in `public/sw.js` (served from root scope, passes the proxy dot-matcher).
- Strategy (deliberately conservative — a conference site, content updates via ISR):
  - `install`: pre-cache an **offline fallback** page `/offline` and core static (logo, offline CSS is inlined in the page) → name-versioned cache `devfest-v1`.
  - `activate`: delete old caches not matching current version.
  - `fetch`: **navigations** → network-first, fall back to cached `/offline` when offline. **Static assets** (`/_next/static`, `/icons`, images) → stale-while-revalidate. Everything else → pass-through (network only). Never cache `/api/*` or Firestore.
- **`/offline` route**: a minimal localized-ish static page (`src/app/offline/page.tsx`, outside `[locale]` so it has a fixed path) — logo + "You're offline" + the four-color beam. Kept tiny.
- **Registration**: `src/components/pwa/RegisterSW.tsx` ("use client", `useEffect` → `navigator.serviceWorker.register('/sw.js')`, guarded by `'serviceWorker' in navigator` and `process.env.NODE_ENV === 'production'`). Mounted once in root layout `<body>`.
- **Static-export note**: SW + manifest are static files → they work on both Vercel and the GitHub Pages export. Good.

### Versioning
- `CACHE_VERSION` constant at top of `sw.js`; bumping it invalidates old caches on next activate. Documented in a comment.

### Tests
- No unit test for SW (browser API). Manual verification checklist in the plan: Lighthouse PWA / installability, offline navigation falls back, cache cleared on version bump.

---

## Feature 3 — Notify-me capture (own the list)

### Firestore rule (add to `firebase/firestore.rules`)

```
match /subscribers/{id} {
  // Anyone may add themselves to the pre-sale list; nobody can read it but admins.
  allow create: if isValidSubscriber();
  allow read, update, delete: if isAdmin();
}
function isValidSubscriber() {
  return request.resource.data.keys().hasOnly(['email','createdAt','locale','source'])
    && request.resource.data.email is string
    && request.resource.data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
    && request.resource.data.email.size() < 254;
}
```
- Doc id = the **lowercased email** (so re-subscribing is idempotent / no dup rows) — but a deterministic id leaks existence on collision; acceptable for a pre-sale list. Alternative: hashed email id. **Decision: lowercased-email id**, simplest, dedups, and reads are admin-only anyway.

### API route: `src/app/api/subscribe/route.ts` (server, Admin SDK)

- `POST { email, locale }`. Validates email server-side (same regex), trims/lowercases.
- Writes via **Admin SDK** (`src/lib/firebase/admin.ts`) to `subscribers/{emailLower}`: `{ email, createdAt: serverTimestamp, locale, source: 'notify-dialog' }` with `merge:true`.
- **Graceful degrade**: if Admin SDK not configured (seed mode) OR on static export the route is absent → client treats a non-2xx / fetch failure as "couldn't save, but here are the communities to follow" (no hard error). Returns `{ ok: true }` on success, `{ ok: false }` with 4xx on bad email, 503 when backend unconfigured.
- Light anti-abuse: server rejects malformed email and oversized payloads. (No captcha for v1; honeypot field optional — include a hidden field, reject if filled.)

### Dialog upgrade: `NotifyTicketsDialog.tsx`

- Add an email input + submit above the "follow communities" list. States: idle → submitting → success ("You're on the list ✓") → keep showing the community follow links either way.
- On submit: `fetch('/api/subscribe', {email, locale})`. On failure, show a quiet inline note ("Couldn't save right now — follow below to be notified") and leave the follow links. Honeypot hidden input.
- New i18n keys under existing `notify` namespace: `emailLabel`, `emailPlaceholder`, `submit`, `success`, `error`, `privacy` (one line: email used only for the ticket announcement).
- Accessibility: label tied to input, `aria-live` on the status note, error not color-only.

### Tests
- `subscribe.route.test.ts` (if route handlers are unit-testable here) OR a small validator unit test for the shared email regex/normalizer extracted to `src/lib/email.ts` (`normalizeEmail`, `isValidEmail`). Prefer extracting the validator and unit-testing that; the route stays thin.

---

## Architecture summary / boundaries

| Unit | Purpose | Depends on |
|---|---|---|
| `lib/calendar.ts` | ICS + GCal string builders (pure) | none |
| `lib/email.ts` | email normalize/validate (pure) | none |
| `components/common/AddToCalendar.tsx` | calendar dropdown UI | calendar.ts, ui/dropdown |
| `app/manifest.ts` | web manifest | siteConfig, tokens |
| `public/sw.js` | offline shell caching | none (vanilla) |
| `components/pwa/RegisterSW.tsx` | SW registration | none |
| `app/offline/page.tsx` | offline fallback | tokens |
| `app/api/subscribe/route.ts` | persist subscriber | firebase/admin, lib/email |
| `NotifyTicketsDialog.tsx` (edit) | capture email | api/subscribe, lib/email |

Each pure module is independently testable; UI consumes via narrow interfaces.

## Error handling (cross-cutting)
- Calendar: malformed/missing dates → component renders nothing (no broken button).
- PWA: SW registration wrapped in try/catch, prod-only; failure is silent (site still works).
- Subscribe: validation both client + server; backend-unconfigured → 503 + graceful UI; network error → quiet inline note; never blocks the follow-communities path.

## i18n
New namespaces/keys in **both** `messages/it.json` and `messages/en.json`:
- `calendar`: `add`, `google`, `ics`
- `notify`: + `emailLabel`, `emailPlaceholder`, `submit`, `success`, `error`, `privacy`
- (`/offline` page strings are inline IT+EN, not in the message files — see i18n decision above.)
- `offline`: `title`, `body`. The `/offline` page is outside `[locale]` so it can't use next-intl at request time. **Decision:** render BOTH the IT and EN line statically (IT primary, EN secondary) — no JS locale detection. Tiny, robust, works offline with zero hydration. The strings live inline in the page (not in `messages/*.json`) since next-intl isn't available there; the `offline` namespace note above is dropped.

## Testing strategy
- Unit (TDD): `calendar.ts`, `email.ts`.
- Manual checklist (in plan): install prompt, offline fallback, calendar add on Google + ICS opens in a calendar app, subscribe happy + bad-email + offline-degrade paths, both locales.

## Out of scope / deferred
- Push notifications, background sync, periodic ISR-in-SW.
- Per-session calendar visible publicly (gated by `schedulePublished`, intentional).
- Sending email to subscribers (manual export for now).
- Admin UI to read subscribers (comes in Batch 2 admin spec).
