# Batch 2 — Login UI · My Schedule favorites · Admin

Design spec. Date: 2026-06-27. Status: approved-for-implementation pending user review.

One combined spec covering all three Batch 2 sub-features (login is a hard
dependency for the other two; one spec keeps the shared auth/data/security pieces
coherent). Built and reviewed sequentially: **2A Login → 2B Favorites → 2C Admin**.

Branch: `batch2-auth-favorites-admin` (off `main`, which now includes Batch 1).

## Goals

1. **2A Login UI** — surface the already-wired `useAuth` (Google Sign-In) with a
   header sign-in button + avatar dropdown; sign-out; mobile entry.
2. **2B My Schedule favorites** — star sessions; persist to localStorage when
   signed-out and Firestore when signed-in; merge local→cloud on sign-in; a
   dedicated `/my-schedule` page.
3. **2C Admin** — `/admin`, claim-gated, IT-only: sponsors CRUD, team CRUD,
   subscribers read/CSV-export, and runtime config toggles. Plus a `set-admin`
   bootstrap script.

Non-goals: email/password auth (Google only), file upload to Storage (admin
images are URL inputs in v1), bilingual admin (IT only), favorites sharing,
real-time multi-device favorite sync beyond Firestore's own.

## Context / constraints (verified in code)

- `useAuth` (`src/hooks/useAuth.tsx`) is complete: `{ user, loading, enabled,
  signIn, signOut }`. `enabled` = Firebase web config present. No changes needed.
- Client Firestore: `getDb()` (`src/lib/firebase/client.ts`) returns a `Firestore`
  or null. Admin Firestore: `getAdminDb()` + `isAdminConfigured`
  (`src/lib/firebase/admin.ts`, imports `server-only`).
- Firestore rules already present: `users/{uid}/{sub=**}` owner read/write
  (favorites); `sponsors`/`team`/`config` write `if isAdmin()` (custom claim
  `request.auth.token.admin == true`); `subscribers` read `if isAdmin()`.
- Admin custom claim can ONLY be set via the Admin SDK → a bootstrap script.
- Flags (`ticketsAvailable`, `speakersPublished`, `schedulePublished`) live in
  `siteConfig` as constants, read in 6 places: server — `app/[locale]/page.tsx`
  (×2), `app/[locale]/speakers/page.tsx`, `lib/data/content.ts:isSchedulePublished`;
  client — `components/sections/Hero.tsx`, `components/common/TicketButton.tsx`.
- `siteConfig.ts` already anticipates this: "Values can be overridden by env vars
  now and, later, by the Firestore `config/site` document loaded at request time."
- Header (`src/components/layout/Header.tsx`): desktop controls cluster has
  `LanguageSwitcher` + `ThemeToggle`; a Radix `Dialog` mobile menu. `@radix-ui/
  react-dropdown-menu` is a dep.
- Two build modes: server (Vercel) + `STATIC_EXPORT=1` (GitHub Pages). Auth,
  favorites-sync, and admin all require Firebase + a server → on static export the
  admin API routes are stripped (like `/api/subscribe` in Batch 1) and the UI is
  signed-out; favorites still work via localStorage. Nothing may break the export.
- next-intl: messages at repo-root `messages/{it,en}.json`. Public-facing new copy
  goes in BOTH; admin copy is IT-only (see i18n section).

---

## 2A — Login UI

### Component: `src/components/auth/AuthButton.tsx` ("use client")

Consumes `useAuth`. States:
- `!enabled` → render `null` (Firebase unconfigured / seed / static export — no dead button).
- `loading` → a disabled placeholder (avatar-sized skeleton circle) to avoid layout shift.
- signed-out → `<Button variant="outline" size="sm">` "Accedi / Sign in" → `signIn()`.
- signed-in → Radix `DropdownMenu`: trigger = avatar (`user.photoURL` via `next/image`, fallback = initials circle). Content: name + email (muted), a link to `/my-schedule` (label "La mia agenda / My schedule"), separator, "Esci / Sign out" → `signOut()`.

a11y: trigger has `aria-label` (account menu); avatar `<Image alt={user.displayName ?? "account">`; dropdown items keyboard-navigable (Radix default); sign-out not color-only.

### Wiring
- `Header.tsx` desktop: mount `<AuthButton />` in the controls cluster, after `ThemeToggle`.
- Mobile menu: mount `<AuthButton />` in the menu footer near `LanguageSwitcher`.

### i18n
New `auth` namespace in BOTH locale files: `signIn`, `signOut`, `account`, `myschedule`, `signedInAs`.

### Degrade / testing
Renders nothing when `!enabled`, so seed/static builds are clean. Real sign-in needs a live Firebase project (not configured locally) → verified by lint + build + a documented manual go-live check. The avatar host `lh3.googleusercontent.com` is already in `next.config` `remotePatterns`.

---

## 2B — My Schedule favorites

### Pure module: `src/lib/favorites.ts` (no React, unit-tested)

```ts
const LS_KEY = "devfest:favorites";
export function readLocal(): string[];                 // parse LS, [] on miss/corrupt
export function writeLocal(ids: string[]): void;
export function mergeFavorites(local: string[], cloud: string[]): string[]; // union, dedup, stable order
```
Keep this module to serialization + merge only (the parts worth testing). `mergeFavorites` = unique union preserving first-seen order. (CSV export is a separate concern — see `lib/csv.ts` under 2C.)

### Hook: `src/hooks/useFavorites.tsx` ("use client", context provider)

- Holds `Set<string>` in state; exposes `{ favorites: Set, isFavorite(id), toggle(id), count }`.
- Signed-out: source = localStorage; `toggle` updates state + `writeLocal`.
- Signed-in: source = Firestore `users/{uid}/favorites` (each doc id = sessionId, body `{ addedAt }`); subscribe via `onSnapshot`; `toggle` does optimistic local update + `setDoc`/`deleteDoc`, rollback on error.
- **Merge on sign-in:** when auth transitions null→user, read localStorage, `mergeFavorites` with current cloud, write the union to Firestore (batch), then clear localStorage. Guard so it runs once per transition.
- Provider mounted in `Providers` (alongside `AuthProvider`). Degrades to localStorage-only when `getDb()` is null.

### Components
- `src/components/agenda/FavoriteButton.tsx` ("use client") — star/star-filled toggle. Props `sessionId`, `size?`. `aria-pressed`, labelled "Aggiungi/Rimuovi dai preferiti". Placed top-right of `SessionCard` (absolute, inside the existing `relative` article).
- `src/app/[locale]/my-schedule/page.tsx` — client page (needs the hook/auth). Lists starred sessions resolved against `getSessions()` data, grouped by start time (reuse `SessionCard` + Batch 1 per-session `AddToCalendar`). Empty state with a link to `/agenda`. Signed-out: shows localStorage favorites + an inline "sign in to sync across devices" nudge. Add to nav? No — reachable from the avatar menu (keeps the public nav lean while signed-out).

### Security / rules
No rule changes: `users/{uid}/{sub=**}` owner read/write already covers
`users/{uid}/favorites/{sessionId}`. A favorite stores only `{ addedAt }`; the
session id is the doc id. Client writes are owner-scoped by the existing rule.

### Degrade / testing
Works against seed sessions now; the page is reachable but only meaningful once
sessions exist (it does NOT depend on `schedulePublished` — favoriting a seed
session is fine). localStorage path works with zero Firebase. TDD `favorites.ts`
(readLocal corrupt-JSON → [], mergeFavorites union/dedup/order).

---

## 2C — Admin

### Bootstrap: `scripts/set-admin.ts`

- Run: `pnpm set-admin <email>` (add a `"set-admin": "tsx scripts/set-admin.ts"` script; `tsx` as devDep if not present).
- Uses Admin SDK (`FIREBASE_ADMIN_*` env): look up the user by email, `setCustomUserClaims(uid, { admin: true })`, print confirmation. Idempotent. Documented in README + STATUS as the only way to grant admin.

### Access guard
- `src/lib/auth/admin-guard.ts` (server) — `verifyAdmin(req): Promise<boolean>`: read the Firebase ID token from an `Authorization: Bearer <token>` header (client attaches `await user.getIdToken()`), verify via Admin SDK `verifyIdToken`, check `decoded.admin === true`. Returns false when unconfigured.
- `src/app/[locale]/admin/layout.tsx` — client shell that requires `useAuth.user` with an admin token (reads `getIdTokenResult()`, checks `claims.admin`); non-admins see a "not authorized" state, signed-out sees a sign-in prompt. Server API routes do the real enforcement; this is UX.
- All mutations go through **claim-gated API routes** under `src/app/api/admin/*` — each calls `verifyAdmin` first, returns 401/403 otherwise. No direct client Firestore writes for admin (keeps the write surface server-side + validated).

### Sections (under `/admin`, IT-only UI)
1. **Sponsors** (`/admin/sponsors`) — table + add/edit form (name, tier select, website, `logoLight`/`logoDark` URL inputs, order, active toggle). API: `POST/PUT/DELETE /api/admin/sponsors`. Writes Firestore `sponsors`, then `revalidatePath` the sponsors + home routes. Reorder = edit `order`.
2. **Team** (`/admin/team`) — table + form (name, role it/en, photo URL, links array, order). API `/api/admin/team`. Revalidate `/team`.
3. **Subscribers** (`/admin/subscribers`) — read-only table (email, createdAt, locale, source) from `subscribers`; "Export CSV" button → `GET /api/admin/subscribers/export` returns `text/csv`. CSV serialized by a pure `lib/csv.ts` (tested).
4. **Config** (`/admin/config`) — toggles for `ticketsAvailable` / `speakersPublished` / `schedulePublished`, written to Firestore `config/site`. API `POST /api/admin/config`. Revalidate all affected routes.

### Config plumbing (the one cross-cutting refactor)
- New `src/lib/data/settings.ts`: `getSiteSettings(): Promise<{ ticketsAvailable, speakersPublished, schedulePublished }>` — reads `config/site` via `getAdminDb()`, falls back to `siteConfig` constants per-flag. Server-only.
- Server flag readers switch to `await getSiteSettings()`: `page.tsx` (×2), `speakers/page.tsx`, `content.ts:isSchedulePublished`.
- Client flag readers (Hero, TicketButton) receive the flags via a `SiteSettingsProvider` populated server-side in `app/[locale]/layout.tsx` (the layout is a server component → it can `await getSiteSettings()` and pass values into a client context). Hero/TicketButton read `useSiteSettings()` instead of `siteConfig.<flag>` for the 3 toggleable flags only. All other `siteConfig` use is untouched.
- Back-compat: when Firebase unconfigured, `getSiteSettings` returns the constants → identical behavior to today (seed/static unchanged).

### Security
- Every `/api/admin/*` route calls `verifyAdmin` (Bearer ID token + `admin` claim) before any read/write. 401 (no/invalid token) / 403 (valid token, not admin).
- Admin SDK writes bypass Firestore rules; the existing `isAdmin()` client-write rules remain as defense-in-depth (no client ever writes these directly).
- Subscribers stay admin-only (existing rule + the export route is claim-gated).
- CSV export sets `Content-Disposition: attachment; filename="subscribers.csv"`.

### Degrade / testing
On static export the `/api/admin/*` routes are stripped and `/admin` pages render the unauthorized/sign-in state (no Firebase) — no build break. TDD the pure pieces: `csv.ts` (escaping commas/quotes/newlines), `getSiteSettings` merge (per-flag fallback), `verifyAdmin` decision table (no token / bad token / non-admin / admin) with the SDK mocked at the boundary.

---

## Architecture summary / boundaries

| Unit | Purpose | Depends on |
|---|---|---|
| `components/auth/AuthButton.tsx` | sign-in / avatar menu | useAuth, radix dropdown |
| `lib/favorites.ts` | LS serialize + merge (pure) | none |
| `hooks/useFavorites.tsx` | favorites state + cloud sync | favorites.ts, getDb, useAuth |
| `components/agenda/FavoriteButton.tsx` | star toggle | useFavorites |
| `app/[locale]/my-schedule/page.tsx` | personal schedule view | useFavorites, getSessions, SessionCard |
| `scripts/set-admin.ts` | grant admin claim | firebase-admin |
| `lib/auth/admin-guard.ts` | verify admin token (server) | firebase-admin |
| `lib/data/settings.ts` | runtime flag read/merge (server) | getAdminDb, siteConfig |
| `components/providers/SiteSettingsProvider.tsx` | flags → client context | (server-populated) |
| `lib/csv.ts` | CSV serialize (pure) | none |
| `app/api/admin/*` | claim-gated mutations | admin-guard, getAdminDb |
| `app/[locale]/admin/*` | IT-only admin UI | useAuth, admin APIs |

## Error handling (cross-cutting)
- Auth: `signIn`/`signOut` already swallow when unconfigured; popup-closed/cancel → no-op, no error toast spam.
- Favorites: optimistic toggle rolls back on write failure; corrupt localStorage → treated as empty; cloud unavailable → localStorage-only.
- Admin: API routes return typed `{ ok, error? }`; UI shows inline error, never a raw 500. Unauthorized → redirect to sign-in / 403 state.
- Config: `getSiteSettings` failure → fall back to constants (fail safe, never blocks page render).

## i18n
- `auth`, `myschedule` namespaces → BOTH `messages/it.json` + `messages/en.json` (public-facing).
- Admin UI is **IT-only**: admin strings live in a single `messages/admin.it.json` imported directly by admin components (NOT through next-intl locale negotiation), OR inline IT constants in the admin components. Decision: inline IT constants in admin components (admin is a small, single-locale surface; avoids wiring a parallel i18n channel). The `/admin` routes still sit under `[locale]` for routing simplicity but render Italian regardless of the locale segment.

## Testing strategy
- Unit (TDD): `lib/favorites.ts`, `lib/csv.ts`, `lib/data/settings.ts` merge, `lib/auth/admin-guard.ts` decision table (SDK mocked).
- Manual (go-live, documented): Google sign-in flow, favorite persists across reload + merges on sign-in, admin claim via script → `/admin` reachable for admin only, sponsor/team edit reflects after revalidate, config toggle flips public UI, CSV downloads.
- Build gates: `pnpm build` + `pnpm build:static` both green; both locales render public copy.

## Out of scope / deferred
- File upload to Firebase Storage (URL inputs for v1).
- Email/password or other providers (Google only).
- Bilingual admin.
- Favorites: cross-device conflict resolution beyond Firestore last-write; calendar export of the whole My-Schedule as one .ics (per-session add-to-calendar already exists).
- News CRUD (explicitly skipped this batch).
