# Batch 3 — Gamification · Live Feedback · Organizer Dashboard

Design spec. Date: 2026-06-27. Status: approved-for-implementation pending user review.

One combined spec for Phase 3, built sequentially: **3A Gamification → 3B Feedback
→ 3C Dashboard** (the dashboard aggregates the first two). Largest batch; reuses the
whole Batch 1/2 stack (auth, admin guard/routes/UI, favorites client-Firestore
pattern, data layer, rules, runtime settings).

Branch: `batch3-gamification-feedback-dashboard` (off `main`, which now includes
Batches 1 + 2).

## Goals
1. **3A DevFest Quest** — admin defines QR **checkpoints** + **badges**; signed-in
   attendees scan checkpoints with an **in-app camera scanner**, earn
   server-awarded **points** + **badges**, and appear on an **opt-in leaderboard**.
2. **3B Live feedback** — signed-in attendees rate sessions (1–5 ★ + optional
   comment); one editable response per user per session.
3. **3C Organizer dashboard** — an admin view aggregating feedback (per session)
   and gamification stats (scans, badges, leaderboard) + existing subscriber count.

Non-goals: real-money rewards; social feeds/comments between users; multi-event;
fraud-proofing beyond per-checkpoint token + one-scan dedup; OS-camera/URL scanning
(decided: in-app camera); attributed feedback (decided: anonymous to organizers).

## Hard security principle (governs the whole batch)
**Game state is server-authoritative.** Points, badges, and scan records are
written ONLY by the Admin SDK inside validated server routes. They live in a
`gameProfiles/{uid}` collection that is **owner-read, never client-write**. The
owner-writable `users/{uid}` doc holds only user preferences (`displayName`,
`leaderboardOptIn`). Checkpoint **secrets never reach the client**. This prevents
a signed-in user from self-granting points or reading other people's data.

## Context / constraints (verified)
- Auth: `useAuth` → `{ user, loading, enabled, signIn, signOut }`. Client
  `getDb()`/`getFirebaseAuth()`; Admin `getAdminDb()`/`getAdminAuth()`/`isAdminConfigured`.
- `verifyAdmin(req)` (`@/lib/auth/admin-guard`) — Bearer ID token + `admin` claim.
  We add a sibling `verifyUser(req)` returning the uid (any signed-in user).
- `adminFetch` (`@/lib/admin-client`) attaches the ID token; we add a parallel
  `userFetch` for signed-in (non-admin) calls (scan, feedback, prefs).
- Admin shell exists: `AdminGate`, `/admin/*` layout with an IT nav, claim-gated
  `/api/admin/*` route pattern (verifyAdmin → 503-if-null-db → 400 → act → revalidate).
- Data layer `content.ts` reads Firestore-or-seed. `getSiteSettings` runtime flags.
- Static export (`STATIC_EXPORT=1`) strips `src/app/api` AND `src/app/[locale]/admin`
  via `scripts/static-build.sh`. **All new `/api/*` and the new `/play/*` + admin
  pages must degrade or be stripped, never break the export.** `/play/*` pages are
  client/dynamic (need auth + camera) — they must render a signed-out state on the
  static build, not error. Camera (`getUserMedia`) needs a secure context (HTTPS /
  localhost) — fine on Vercel.
- Firestore may be unconfigured (seed): every server route null-guards `getAdminDb()`.
- i18n: player-facing copy in a new `play` namespace in BOTH `messages/{it,en}.json`;
  admin UI stays IT-only inline.
- New deps: `jsqr` (decode camera frames), `qrcode` (admin QR rendering).

---

## Data model (new collections)

| Collection / doc | Shape | Read | Write |
|---|---|---|---|
| `checkpoints/{id}` | `{ name: LocalizedString, points: number, badgeId?: string, active: boolean, secret: string }` | **admin only** | admin |
| `badges/{id}` | `{ name: LocalizedString, description: LocalizedString, icon: string, milestone?: number }` | public | admin |
| `gameProfiles/{uid}` | `{ points: number, badgeIds: string[], scanCount: number }` | owner | **server only** |
| `gameProfiles/{uid}/scans/{checkpointId}` | `{ at: Timestamp, points: number }` | owner | **server only** |
| `users/{uid}` (existing doc) | + `{ displayName?: string, leaderboardOptIn?: boolean }` | owner | owner |
| `leaderboard/{uid}` | `{ displayName: string, points: number }` | public | **server only** |
| `feedback/{sessionId}/responses/{uid}` | `{ rating: 1..5, comment?: string, at: Timestamp }` | owner or admin | owner (validated) |

`badge.milestone` (optional number) marks a badge auto-awarded when `scanCount`
reaches that threshold. `badge.icon` is an emoji or a URL.

### Firestore rules to add (before the final deny)
```
match /checkpoints/{id} { allow read, write: if isAdmin(); }
match /badges/{id}      { allow read: if true; allow write: if isAdmin(); }
match /leaderboard/{uid}{ allow read: if true; allow write: if false; } // Admin SDK only
match /gameProfiles/{uid} {
  allow read: if isOwner(uid);
  allow write: if false;                  // Admin SDK only
  match /scans/{cid} { allow read: if isOwner(uid); allow write: if false; }
}
match /feedback/{sid}/responses/{uid} {
  allow read: if isOwner(uid) || isAdmin();
  allow create, update: if isOwner(uid) && validFeedback();
  allow delete: if false;
}
function validFeedback() {
  return request.resource.data.rating is int
    && request.resource.data.rating >= 1 && request.resource.data.rating <= 5
    && (!('comment' in request.resource.data) || request.resource.data.comment.size() <= 500);
}
```
(`users/{uid}` keeps its existing owner read/write — now also holding the two pref
fields. Favorites stay under `users/{uid}/favorites`.)

---

## Shared building blocks

- `src/lib/auth/user-guard.ts` — `verifyUser(req): Promise<string | null>` (mirror of
  `verifyAdmin` but returns `decoded.uid` for any valid token, else null). TDD with the
  same mocked-SDK decision table.
- `src/lib/user-client.ts` — `userFetch(path, init)` (same as `adminFetch`: attaches the
  signed-in user's ID token; content-type json on body).
- `src/lib/gamification.ts` (pure, TDD):
  - `validateScan(checkpoint, token): "ok" | "not-found" | "inactive" | "bad-token"`.
  - `awardForScan(profile, checkpoint, milestoneBadges): { points, badgeIds, scanCount }` —
    returns the NEW profile after a first-time scan: `points += checkpoint.points`,
    add `checkpoint.badgeId` (if any), increment `scanCount`, then add any
    `milestoneBadges` whose `milestone <= scanCount` and not already held. Idempotent
    callers guarantee first-time-only.
  - `parseQrPayload(text): { checkpointId, token } | null` — payload format
    `DFQ:{checkpointId}:{token}` (prefix guards against unrelated QR codes).
- `src/lib/feedback-stats.ts` (pure, TDD):
  - `aggregate(responses): { count, average, distribution: [n1,n2,n3,n4,n5], comments: string[] }`
    — average rounded to 1 decimal; `comments` are the non-empty comment strings
    only (NO uid → anonymous).

---

## 3A — DevFest Quest (gamification)

### Admin
- **Checkpoints** (`/admin/checkpoints`, `/api/admin/checkpoints`) — CRUD like sponsors.
  Fields: name (it/en), points, badge (select from badges), active. On create the
  server generates a random `secret` (e.g. 16 hex chars) — never editable, never sent
  to non-admins. A per-row **"QR"** action opens a printable view that renders the QR
  for `DFQ:{id}:{secret}` via `qrcode` (client, to a canvas/data-URL) + the checkpoint
  name. (Admins can read the secret; that's intended.)
- **Badges** (`/admin/badges`, `/api/admin/badges`) — CRUD. Fields: name (it/en),
  description (it/en), icon (emoji/URL), milestone (optional number).
- Both added to the admin nav.

### Scan flow
- `/api/scan` (POST, **verifyUser**): body `{ checkpointId, token }`.
  - `uid = verifyUser(req)`; 401 if null. `getAdminDb()` null → 503.
  - Load `checkpoints/{checkpointId}`; `validateScan` → 404/403 as appropriate.
  - **Idempotent, transactional:** if `gameProfiles/{uid}/scans/{checkpointId}` exists →
    return `{ ok: true, already: true }` (no re-award). Else, in a transaction: write the
    scan doc, compute `awardForScan`, write `gameProfiles/{uid}` (points/badgeIds/scanCount),
    and if `users/{uid}.leaderboardOptIn` is true, upsert `leaderboard/{uid}` =
    `{ displayName, points }`. Return `{ ok: true, awarded: { points, newBadgeIds } }`.
- **Scanner** `/play/scan` (client, signed-in): `getUserMedia({ video: { facingMode:
  "environment" } })` → `<video>` → sample frames onto a `<canvas>` → `jsQR(imageData)`
  on an interval → on decode, `parseQrPayload`; if valid, stop the camera and POST via
  `userFetch`. Show the award result (points + any new badge). Handle: permission
  denied, no camera, already-scanned, invalid QR. Stop tracks on unmount.

### Player surface (`play` i18n namespace, both locales)
- `/play` — points total, **badge wall** (earned vs locked from the public `badges`
  catalog), a **leaderboard opt-in** toggle + display-name input. Saving prefs goes
  through `POST /api/play/profile` (NOT a direct client write) — the route is the single
  mechanism that writes `users/{uid}.{displayName, leaderboardOptIn}` AND immediately
  upserts (opt-in) or deletes (opt-out) `leaderboard/{uid}`, keeping the public board
  consistent. Links to scan + leaderboard.
- `/play/leaderboard` — top 50 from `leaderboard` ordered by points desc (client read,
  live via `onSnapshot`).
- **Header:** a "DevFest Quest" button shown when `useAuth.user` is set (next to the
  avatar; hidden when signed-out / unconfigured).

### Profile route
- `/api/play/profile` (POST, verifyUser): body `{ displayName?, leaderboardOptIn }`.
  Validates displayName (trim, length ≤ 40, strip control chars). Writes the two fields
  to `users/{uid}` (server-side, so leaderboard stays consistent) and upserts/deletes
  `leaderboard/{uid}` accordingly (using the current `gameProfiles/{uid}.points`).

### Tests
`gamification.ts` (validateScan table, awardForScan first-time + milestone + idempotent
shape, parseQrPayload valid/invalid/prefix). Scan route logic validated by the pure
award fn; route wiring verified by build + manual.

---

## 3B — Live feedback
- `/api/feedback` (POST, **verifyUser**): body `{ sessionId, rating, comment? }`.
  Validate `rating` int 1–5, `comment` ≤ 500 chars; `uid = verifyUser`; 401/503/400 as
  usual. `set` `feedback/{sessionId}/responses/{uid}` = `{ rating, comment, at }` (merge →
  idempotent edit). Return `{ ok: true }`.
- `FeedbackForm` (client, signed-in) rendered inside `SessionCard` for non-service
  sessions — the same place `FavoriteButton` + per-session add-to-calendar already live
  (there is no separate session-detail route). Collapsed by default behind a "Rate this
  session" control to keep the card compact; expands to a star selector + optional
  comment, prefilled from the user's existing response (read `feedback/{sid}/responses/{uid}`,
  owner-readable). Signed-out → a "sign in to rate" prompt. Works against seed sessions
  now; surfaces wherever sessions render (gated the same as the agenda).
- Rules `validFeedback()` enforce the shape even though writes are client-side
  (owner-scoped) — defense in depth; the route also validates.
- Tests: `feedback-stats.ts` aggregate (count/avg/distribution/anonymised comments).

---

## 3C — Organizer dashboard
- `/admin/dashboard` (IT) + `/api/admin/dashboard` (GET, verifyAdmin) returning a
  server-aggregated payload:
  - **Feedback:** per session `{ sessionId, title, count, average, distribution }` +
    a flat anonymised comment list. (Reads `feedback/*/responses/*` via Admin SDK,
    runs `aggregate`, strips uid.)
  - **Gamification:** scans per checkpoint (count), badge distribution (how many users
    hold each badge), top 10 leaderboard, total players.
  - **Subscribers:** count (reuse `getSubscriberRows().length`).
- The dashboard page renders tables/simple bars (no chart lib — CSS bars). Make it the
  default landing of `/admin` (link first in the admin nav).
- Tests: aggregation reuses the tested `aggregate`; route wiring verified by build.

---

## Architecture summary / boundaries

| Unit | Purpose | Tested |
|---|---|---|
| `lib/auth/user-guard.ts` | verify signed-in uid (server) | ✓ |
| `lib/user-client.ts` | userFetch (attach ID token) | — |
| `lib/gamification.ts` | validateScan · awardForScan · parseQrPayload (pure) | ✓ |
| `lib/feedback-stats.ts` | aggregate responses (pure) | ✓ |
| `app/api/scan` | validated, idempotent scan → award | (via pure fn) |
| `app/api/feedback` | upsert one response per user/session | — |
| `app/api/play/profile` | set prefs + sync leaderboard entry | — |
| `app/api/admin/checkpoints` · `/badges` · `/dashboard` | admin CRUD + aggregate | — |
| `components/play/*` | scanner · player home · leaderboard · badge wall | — |
| `components/feedback/FeedbackForm` | rate a session | — |
| `components/admin/*` | checkpoints · badges · dashboard UIs | — |
| `app/[locale]/play/*` · `app/[locale]/admin/{checkpoints,badges,dashboard}` | routes | — |

## Error handling
- Scanner: permission denied / no camera / decode failure / invalid-prefix QR →
  inline messages, camera always stopped on unmount or success.
- Scan route: not-found/inactive/bad-token → 4xx with a reason; already-scanned →
  200 `{already:true}` (friendly, not an error). DB unconfigured → 503.
- Feedback/profile routes: validation 400; 401 when unauthenticated; 503 unconfigured.
- All player/admin pages degrade to a sign-in / not-authorized state when Firebase is
  absent (seed/static), never a 500 or build break.

## i18n
- `play` namespace (player-facing: quest title, points, scan prompts, permission errors,
  badge wall, leaderboard, opt-in, feedback form) in BOTH `messages/it.json` + `en.json`.
- Admin (checkpoints/badges/dashboard) IT-only inline.

## Testing strategy
- Unit (TDD): `user-guard` (decision table), `gamification` (validateScan / awardForScan /
  parseQrPayload), `feedback-stats` (aggregate).
- Build gates: `pnpm build` + `pnpm build:static` both green (admin + api stripped on
  static; `/play/*` renders signed-out state); `pnpm test` green; both locales render `play`.
- Manual (go-live, needs a live Firebase project + a phone): admin creates a checkpoint →
  print QR → scan in-app → points/badge awarded once (re-scan no double) → opt into
  leaderboard → appears ranked → rate a session → dashboard shows the aggregate.

## Out of scope / deferred
- OS-camera/URL-deep-link scanning (chose in-app camera).
- Attributed feedback; cross-user social features.
- Anti-cheat beyond per-checkpoint secret + one-scan dedup (e.g. geofencing, rate limits).
- Real prizes/fulfilment; exporting game data (could reuse the CSV helper later).
- News CRUD (still skipped).
