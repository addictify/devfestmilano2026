# Batch 3 (Gamification · Feedback · Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a QR scavenger-hunt "DevFest Quest" (server-awarded points/badges + opt-in leaderboard), per-session live feedback, and an organizer dashboard aggregating both.

**Architecture:** Pure modules (`gamification.ts`, `feedback-stats.ts`, `user-guard.ts`) are TDD'd with Vitest. Game state is **server-authoritative**: points/badges/scans live in `gameProfiles/{uid}` (owner-read, never client-write) and are written only by Admin SDK inside validated routes (`/api/scan`, `/api/play/profile`). Player pages (`/play/*`) and feedback are signed-in client surfaces calling token-authenticated routes; the admin gains checkpoints/badges CRUD + a dashboard. Everything reuses the Batch 1/2 stack.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, next-intl, Firebase (client + Admin SDK), Vitest, **jsqr** (decode camera frames — new dep), **qrcode** (admin QR rendering — new dep).

## Global Constraints

- Next.js 16 App Router — `params` is a Promise; read `node_modules/next/dist/docs/` before unfamiliar APIs.
- Path alias `@/*` → `./src/*`.
- **Security (governs everything):** points/badges/scan records are written ONLY by the Admin SDK in server routes. They live in `gameProfiles/{uid}` — owner-read, NEVER client-write. Checkpoint `secret` never reaches a non-admin client. Leaderboard exposes only opt-in `{displayName, points}`. Scan + feedback + profile routes authenticate with `verifyUser` (Bearer ID token → uid).
- i18n: player-facing copy in a new `play` namespace in BOTH `messages/it.json` + `messages/en.json`. Admin UI (checkpoints/badges/dashboard) is **IT-only inline constants** (NOT in message files).
- Two build modes: server (Vercel) + `STATIC_EXPORT=1` (GitHub Pages). `scripts/static-build.sh` already strips `src/app/api` + `src/app/[locale]/admin`. New `/play/*` pages are client/dynamic and MUST render a signed-out state on the static build (no Firebase, no camera) — never a build break. API routes that need a server set `export const dynamic = "force-dynamic"`.
- Firebase may be unconfigured (seed): every server route null-guards `getAdminDb()` → 503; client surfaces degrade to signed-out.
- `getUserMedia` needs a secure context (HTTPS / localhost) — fine on Vercel; guard for absence.
- Existing helpers: `useAuth` (`@/hooks/useAuth`); `getDb`/`getFirebaseAuth`/`isFirebaseConfigured` (`@/lib/firebase/client`); `getAdminDb`/`getAdminAuth`/`isAdminConfigured` (`@/lib/firebase/admin`); `verifyAdmin` (`@/lib/auth/admin-guard`); `adminFetch` (`@/lib/admin-client`); `Button` (`@/components/ui/button`); `cn`; `localized`; `Link` (`@/i18n/navigation`); `SessionCard` (`@/components/agenda/SessionCard`, a server component that renders client children); GDG tokens; `getSessions` (`@/lib/data/content`); `LocalizedString` (`@/types/models`).
- Admin route pattern (from Batch 2): `export const dynamic = "force-dynamic"`; handler = `verifyAdmin` → 403, `getAdminDb()` null → 503, validate body → 400, act, `revalidatePath`. Admin UIs use `adminFetch` + `router.refresh()` + `setError` on both save AND delete failure.
- Commit after every task. Branch `batch3-gamification-feedback-dashboard` (checked out, off main with Batches 1+2). No push.

---

# Foundations

## Task 1: `verifyUser` guard + `userFetch` client helper

**Files:**
- Create: `src/lib/auth/user-guard.ts`, `src/lib/auth/user-guard.test.ts`
- Create: `src/lib/user-client.ts`

**Interfaces:**
- Consumes: `getAdminAuth` (`@/lib/firebase/admin`), `getFirebaseAuth` (`@/lib/firebase/client`).
- Produces: `verifyUser(req: Request): Promise<string | null>` (uid or null); `userFetch(path: string, init?: RequestInit): Promise<Response>`.

- [ ] **Step 1: Write failing tests for `verifyUser`** (mock the SDK boundary, same pattern as admin-guard)

`src/lib/auth/user-guard.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: () => ({ verifyIdToken }) }));

import { verifyUser } from "@/lib/auth/user-guard";

const req = (h: Record<string, string> = {}) => new Request("http://localhost/api/x", { headers: h });
beforeEach(() => verifyIdToken.mockReset());

describe("verifyUser", () => {
  it("null when no Authorization header", async () => {
    expect(await verifyUser(req())).toBe(null);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
  it("null when token invalid (verify throws)", async () => {
    verifyIdToken.mockImplementation(() => Promise.reject(new Error("bad")));
    expect(await verifyUser(req({ authorization: "Bearer xxx" }))).toBe(null);
  });
  it("returns uid for a valid token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    expect(await verifyUser(req({ authorization: "Bearer good" }))).toBe("u1");
    expect(verifyIdToken).toHaveBeenCalledWith("good");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/auth/user-guard.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/auth/user-guard.ts`**

```ts
import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";

/** The uid for a valid Firebase ID token, else null. Any signed-in user. */
export async function verifyUser(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return typeof decoded.uid === "string" ? decoded.uid : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/auth/user-guard.test.ts` → 3 passed, clean output.

- [ ] **Step 5: Implement `src/lib/user-client.ts`**

```ts
import { getFirebaseAuth } from "@/lib/firebase/client";

/** fetch() with the current signed-in user's ID token attached (any user). */
export async function userFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const auth = getFirebaseAuth();
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  return fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
}
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm lint` → clean.
```bash
git add src/lib/auth/user-guard.ts src/lib/auth/user-guard.test.ts src/lib/user-client.ts
git commit -m "feat: verifyUser server guard + userFetch client helper"
```

---

## Task 2: `gamification.ts` — pure scan/award/parse logic (TDD)

**Files:**
- Create: `src/lib/gamification.ts`, `src/lib/gamification.test.ts`

**Interfaces:**
- Produces:
  - `type GameProfile = { points: number; badgeIds: string[]; scanCount: number }`
  - `type Checkpoint = { points: number; badgeId?: string; active: boolean; secret: string }`
  - `type MilestoneBadge = { id: string; milestone: number }`
  - `validateScan(checkpoint: { active: boolean; secret: string } | null, token: string): "ok" | "not-found" | "inactive" | "bad-token"`
  - `awardForScan(profile: GameProfile, checkpoint: { points: number; badgeId?: string }, milestoneBadges: MilestoneBadge[]): GameProfile` — the NEW profile after a first-time scan.
  - `parseQrPayload(text: string): { checkpointId: string; token: string } | null` — format `DFQ:{checkpointId}:{token}`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { awardForScan, parseQrPayload, validateScan } from "@/lib/gamification";

describe("validateScan", () => {
  it("not-found when null", () => expect(validateScan(null, "x")).toBe("not-found"));
  it("inactive when inactive", () => expect(validateScan({ active: false, secret: "s" }, "s")).toBe("inactive"));
  it("bad-token on mismatch", () => expect(validateScan({ active: true, secret: "s" }, "x")).toBe("bad-token"));
  it("ok on match + active", () => expect(validateScan({ active: true, secret: "s" }, "s")).toBe("ok"));
});

describe("awardForScan", () => {
  const base = { points: 10, badgeIds: ["a"], scanCount: 1 };
  it("adds points, badge, increments scanCount", () => {
    expect(awardForScan(base, { points: 5, badgeId: "b" }, [])).toEqual({
      points: 15, badgeIds: ["a", "b"], scanCount: 2,
    });
  });
  it("does not duplicate an already-held badge", () => {
    expect(awardForScan(base, { points: 5, badgeId: "a" }, [])).toEqual({
      points: 15, badgeIds: ["a"], scanCount: 2,
    });
  });
  it("awards a milestone badge when scanCount reaches it", () => {
    const r = awardForScan({ points: 0, badgeIds: [], scanCount: 4 }, { points: 1 }, [{ id: "m5", milestone: 5 }]);
    expect(r.scanCount).toBe(5);
    expect(r.badgeIds).toContain("m5");
  });
  it("no milestone before threshold", () => {
    const r = awardForScan({ points: 0, badgeIds: [], scanCount: 1 }, { points: 1 }, [{ id: "m5", milestone: 5 }]);
    expect(r.badgeIds).not.toContain("m5");
  });
});

describe("parseQrPayload", () => {
  it("parses a valid DFQ payload", () => expect(parseQrPayload("DFQ:cp1:tok9")).toEqual({ checkpointId: "cp1", token: "tok9" }));
  it("null on wrong prefix", () => expect(parseQrPayload("https://evil/cp1:tok")).toBe(null));
  it("null on malformed", () => expect(parseQrPayload("DFQ:onlyone")).toBe(null));
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/gamification.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/lib/gamification.ts`**

```ts
export type GameProfile = { points: number; badgeIds: string[]; scanCount: number };
export type MilestoneBadge = { id: string; milestone: number };

export function validateScan(
  checkpoint: { active: boolean; secret: string } | null,
  token: string,
): "ok" | "not-found" | "inactive" | "bad-token" {
  if (!checkpoint) return "not-found";
  if (!checkpoint.active) return "inactive";
  if (checkpoint.secret !== token) return "bad-token";
  return "ok";
}

/** New profile after a FIRST-TIME scan (caller guarantees no prior scan doc). */
export function awardForScan(
  profile: GameProfile,
  checkpoint: { points: number; badgeId?: string },
  milestoneBadges: MilestoneBadge[],
): GameProfile {
  const scanCount = profile.scanCount + 1;
  const badgeIds = [...profile.badgeIds];
  const add = (id?: string) => {
    if (id && !badgeIds.includes(id)) badgeIds.push(id);
  };
  add(checkpoint.badgeId);
  for (const m of milestoneBadges) if (scanCount >= m.milestone) add(m.id);
  return { points: profile.points + checkpoint.points, badgeIds, scanCount };
}

export function parseQrPayload(text: string): { checkpointId: string; token: string } | null {
  const parts = text.split(":");
  if (parts.length !== 3 || parts[0] !== "DFQ") return null;
  const [, checkpointId, token] = parts;
  if (!checkpointId || !token) return null;
  return { checkpointId, token };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/gamification.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification.ts src/lib/gamification.test.ts
git commit -m "feat: gamification pure logic (validateScan, awardForScan, parseQrPayload)"
```

---

## Task 3: `feedback-stats.ts` — aggregate responses (pure, TDD)

**Files:**
- Create: `src/lib/feedback-stats.ts`, `src/lib/feedback-stats.test.ts`

**Interfaces:**
- Produces: `aggregate(responses: { rating: number; comment?: string }[]): { count: number; average: number; distribution: [number, number, number, number, number]; comments: string[] }`. Average rounded to 1 decimal; `comments` = trimmed non-empty comment strings only (no uid → anonymous).

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { aggregate } from "@/lib/feedback-stats";

describe("aggregate", () => {
  it("empty → zeros", () => {
    expect(aggregate([])).toEqual({ count: 0, average: 0, distribution: [0, 0, 0, 0, 0], comments: [] });
  });
  it("counts, averages (1dp), buckets, collects non-empty comments", () => {
    const r = aggregate([
      { rating: 5, comment: "great" },
      { rating: 4 },
      { rating: 4, comment: "  " },
      { rating: 2, comment: "meh" },
    ]);
    expect(r.count).toBe(4);
    expect(r.average).toBe(3.8);                 // (5+4+4+2)/4 = 3.75 → 3.8
    expect(r.distribution).toEqual([0, 1, 0, 2, 1]); // idx0=1★ ... idx4=5★
    expect(r.comments).toEqual(["great", "meh"]);    // blank dropped
  });
});
```

- [ ] **Step 2: Run, verify fail** — `pnpm test src/lib/feedback-stats.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/lib/feedback-stats.ts`**

```ts
export function aggregate(
  responses: { rating: number; comment?: string }[],
): { count: number; average: number; distribution: [number, number, number, number, number]; comments: string[] } {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const comments: string[] = [];
  let sum = 0;
  for (const r of responses) {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating - 1]++;
      sum += r.rating;
    }
    const c = r.comment?.trim();
    if (c) comments.push(c);
  }
  const count = responses.length;
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;
  return { count, average, distribution, comments };
}
```

- [ ] **Step 4: Run, verify pass** — `pnpm test src/lib/feedback-stats.test.ts` → pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feedback-stats.ts src/lib/feedback-stats.test.ts
git commit -m "feat: feedback aggregation (count, average, distribution, anonymised comments)"
```

---

## Task 4: Firestore rules for the new collections

**Files:**
- Modify: `firebase/firestore.rules`

**Interfaces:** none (rules).

- [ ] **Step 1: Add the rules** before the final `match /{document=**}` deny block, inside the documents match

Add a `validFeedback()` function alongside the existing functions, and these collection blocks:
```
    function validFeedback() {
      return request.resource.data.rating is int
        && request.resource.data.rating >= 1 && request.resource.data.rating <= 5
        && (!('comment' in request.resource.data) || request.resource.data.comment.size() <= 500);
    }

    match /checkpoints/{id} { allow read, write: if isAdmin(); }
    match /badges/{id}      { allow read: if true; allow write: if isAdmin(); }
    match /leaderboard/{uid} { allow read: if true; allow write: if false; }
    match /gameProfiles/{uid} {
      allow read: if isOwner(uid);
      allow write: if false;
      match /scans/{cid} { allow read: if isOwner(uid); allow write: if false; }
    }
    match /feedback/{sid}/responses/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow create, update: if isOwner(uid) && validFeedback();
      allow delete: if false;
    }
```
(`leaderboard` and `gameProfiles` are written only by the Admin SDK, which bypasses rules — hence `write: if false` for clients. `isAdmin`/`isOwner` already exist.)

- [ ] **Step 2: Verify structure**

Run: `node -e "const s=require('fs').readFileSync('firebase/firestore.rules','utf8'); const o=(s.match(/{/g)||[]).length, c=(s.match(/}/g)||[]).length; console.log('braces', o, c, o===c ? 'balanced' : 'MISMATCH')"`
Expected: `braces N N balanced`.
Run: `pnpm build` → still succeeds (rules don't affect build, but confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add firebase/firestore.rules
git commit -m "feat: Firestore rules for checkpoints, badges, gameProfiles, leaderboard, feedback"
```

---

# 3A — DevFest Quest

## Task 5: Badges admin (route + UI)

**Files:**
- Create: `src/app/api/admin/badges/route.ts`
- Create: `src/app/[locale]/admin/badges/page.tsx`
- Create: `src/components/admin/BadgesAdmin.tsx`
- Create: `src/lib/data/game.ts` (server reads for badges + checkpoints, used by admin pages + routes)

**Interfaces:**
- Consumes: `verifyAdmin`, `getAdminDb`, `adminFetch`, `LocalizedString`.
- Produces: `Badge` type + `getBadges()`/`getCheckpoints()` server reads (in `game.ts`); `POST`/`DELETE /api/admin/badges`.

- [ ] **Step 1: Create `src/lib/data/game.ts`** (server reads; seed = empty arrays)

```ts
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { LocalizedString } from "@/types/models";

export type Badge = { id: string; name: LocalizedString; description: LocalizedString; icon: string; milestone?: number };
export type Checkpoint = { id: string; name: LocalizedString; points: number; badgeId?: string; active: boolean; secret: string };

async function readAll<T extends { id: string }>(collection: string): Promise<T[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection(collection).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  } catch {
    return [];
  }
}

export const getBadges = () => readAll<Badge>("badges");
export const getCheckpoints = () => readAll<Checkpoint>("checkpoints");
```

- [ ] **Step 2: API route `src/app/api/admin/badges/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nameIt !== "string" || !body.nameIt) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("badges").doc().id;
  const ms = Number(body.milestone);
  const data = {
    name: { it: body.nameIt, en: body.nameEn || body.nameIt },
    description: { it: body.descIt || "", en: body.descEn || body.descIt || "" },
    icon: typeof body.icon === "string" ? body.icon : "🏅",
    ...(Number.isFinite(ms) && ms > 0 ? { milestone: ms } : {}),
  };
  await db.collection("badges").doc(id).set(data, { merge: true });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("badges").doc(id).delete();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Server page `src/app/[locale]/admin/badges/page.tsx`**

```tsx
import { getBadges } from "@/lib/data/game";
import { BadgesAdmin } from "@/components/admin/BadgesAdmin";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const badges = await getBadges();
  return <BadgesAdmin initial={badges} />;
}
```

- [ ] **Step 4: Client UI `src/components/admin/BadgesAdmin.tsx`** (IT inline)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import type { Badge } from "@/lib/data/game";

type Draft = { id?: string; nameIt: string; nameEn: string; descIt: string; descEn: string; icon: string; milestone: string };
const EMPTY: Draft = { nameIt: "", nameEn: "", descIt: "", descEn: "", icon: "🏅", milestone: "" };
const toDraft = (b: Badge): Draft => ({
  id: b.id, nameIt: b.name.it, nameEn: b.name.en, descIt: b.description.it, descEn: b.description.en,
  icon: b.icon, milestone: b.milestone ? String(b.milestone) : "",
});

export function BadgesAdmin({ initial }: { initial: Badge[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    const res = await adminFetch("/api/admin/badges", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) { setForm(EMPTY); router.refresh(); } else setError(`Errore (${res.status}).`);
  }
  async function remove(id: string) {
    if (!confirm("Eliminare questo badge?")) return;
    const res = await adminFetch(`/api/admin/badges?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) router.refresh(); else setError(`Errore (${res.status}).`);
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Badge</h2>
      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="py-2">Icona</th><th>Nome (IT)</th><th>Milestone</th><th></th></tr></thead>
        <tbody>
          {initial.map((b) => (
            <tr key={b.id} className="border-t border-border">
              <td className="py-2 text-lg">{b.icon}</td><td>{b.name.it}</td><td>{b.milestone ?? "—"}</td>
              <td className="text-right">
                <button onClick={() => setForm(toDraft(b))} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(b.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica badge" : "Nuovo badge"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome (IT)" v={form.nameIt} on={(v) => setForm({ ...form, nameIt: v })} />
          <F label="Nome (EN)" v={form.nameEn} on={(v) => setForm({ ...form, nameEn: v })} />
          <F label="Descrizione (IT)" v={form.descIt} on={(v) => setForm({ ...form, descIt: v })} />
          <F label="Descrizione (EN)" v={form.descEn} on={(v) => setForm({ ...form, descEn: v })} />
          <F label="Icona (emoji o URL)" v={form.icon} on={(v) => setForm({ ...form, icon: v })} />
          <F label="Milestone (n. scan, vuoto = nessuna)" v={form.milestone} on={(v) => setForm({ ...form, milestone: v })} />
        </div>
        {error && <p className="mt-3 text-sm text-gdg-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy || !form.nameIt}>{form.id ? "Salva" : "Aggiungi"}</Button>
          {form.id && <Button variant="ghost" onClick={() => setForm(EMPTY)}>Annulla</Button>}
        </div>
      </div>
    </div>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="text-sm">{label}
      <input value={v} onChange={(e) => on(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
    </label>
  );
}
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm build` → `/api/admin/badges` + `/admin/badges` present. `pnpm build:static` → succeeds (admin+api stripped). `pnpm lint` → clean.
```bash
git add src/lib/data/game.ts src/app/api/admin/badges/route.ts "src/app/[locale]/admin/badges/page.tsx" src/components/admin/BadgesAdmin.tsx
git commit -m "feat: admin badges CRUD + game data reads"
```

---

## Task 6: Checkpoints admin (route + UI + printable QR)

**Files:**
- Create: `src/app/api/admin/checkpoints/route.ts`
- Create: `src/app/[locale]/admin/checkpoints/page.tsx`
- Create: `src/components/admin/CheckpointsAdmin.tsx`
- Modify: `package.json` (add `qrcode` + `@types/qrcode`)

**Interfaces:**
- Consumes: `verifyAdmin`, `getAdminDb`, `getBadges`/`getCheckpoints`/`Checkpoint`/`Badge` (`@/lib/data/game`), `adminFetch`, `qrcode`.
- Produces: `POST`/`DELETE /api/admin/checkpoints` (server generates `secret` on create).

- [ ] **Step 1: Install qrcode**

Run: `pnpm add qrcode && pnpm add -D @types/qrcode`

- [ ] **Step 2: API route `src/app/api/admin/checkpoints/route.ts`** (server generates secret; never strips it from admin reads, but it is never exposed to non-admins because the collection is admin-only-read)

```ts
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nameIt !== "string" || !body.nameIt) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("checkpoints").doc().id;
  const points = Number(body.points);
  const ref = db.collection("checkpoints").doc(id);
  // Generate a secret only on first create; preserve it on edit.
  const existing = await ref.get();
  const secret = existing.exists ? (existing.data()!.secret as string) : randomBytes(8).toString("hex");
  const data = {
    name: { it: body.nameIt, en: body.nameEn || body.nameIt },
    points: Number.isFinite(points) && points > 0 ? Math.floor(points) : 10,
    badgeId: typeof body.badgeId === "string" && body.badgeId ? body.badgeId : null,
    active: body.active !== false,
    secret,
  };
  await ref.set(data, { merge: true });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("checkpoints").doc(id).delete();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Server page `src/app/[locale]/admin/checkpoints/page.tsx`**

```tsx
import { getBadges, getCheckpoints } from "@/lib/data/game";
import { CheckpointsAdmin } from "@/components/admin/CheckpointsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCheckpointsPage() {
  const [checkpoints, badges] = await Promise.all([getCheckpoints(), getBadges()]);
  return <CheckpointsAdmin initial={checkpoints} badges={badges} />;
}
```

- [ ] **Step 4: Client UI `src/components/admin/CheckpointsAdmin.tsx`** (IT inline; QR via qrcode)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import type { Badge, Checkpoint } from "@/lib/data/game";

type Draft = { id?: string; nameIt: string; nameEn: string; points: string; badgeId: string; active: boolean };
const EMPTY: Draft = { nameIt: "", nameEn: "", points: "10", badgeId: "", active: true };
const toDraft = (c: Checkpoint): Draft => ({
  id: c.id, nameIt: c.name.it, nameEn: c.name.en, points: String(c.points), badgeId: c.badgeId ?? "", active: c.active,
});

export function CheckpointsAdmin({ initial, badges }: { initial: Checkpoint[]; badges: Badge[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ name: string; dataUrl: string } | null>(null);

  async function save() {
    setBusy(true); setError(null);
    const res = await adminFetch("/api/admin/checkpoints", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) { setForm(EMPTY); router.refresh(); } else setError(`Errore (${res.status}).`);
  }
  async function remove(id: string) {
    if (!confirm("Eliminare questo checkpoint?")) return;
    const res = await adminFetch(`/api/admin/checkpoints?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) router.refresh(); else setError(`Errore (${res.status}).`);
  }
  async function showQr(c: Checkpoint) {
    const dataUrl = await QRCode.toDataURL(`DFQ:${c.id}:${c.secret}`, { width: 512, margin: 2 });
    setQr({ name: c.name.it, dataUrl });
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Checkpoint</h2>
      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="py-2">Nome (IT)</th><th>Punti</th><th>Attivo</th><th></th></tr></thead>
        <tbody>
          {initial.map((c) => (
            <tr key={c.id} className="border-t border-border">
              <td className="py-2">{c.name.it}</td><td>{c.points}</td><td>{c.active ? "sì" : "no"}</td>
              <td className="text-right">
                <button onClick={() => showQr(c)} className="mr-3 text-gdg-green hover:underline">QR</button>
                <button onClick={() => setForm(toDraft(c))} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(c.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {qr && (
        <div className="mb-8 rounded-2xl border border-border p-5 text-center print:border-0">
          <p className="mb-3 font-semibold">{qr.name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt={`QR ${qr.name}`} className="mx-auto size-64" />
          <div className="mt-3 flex justify-center gap-2 print:hidden">
            <Button size="sm" onClick={() => window.print()}>Stampa</Button>
            <Button size="sm" variant="ghost" onClick={() => setQr(null)}>Chiudi</Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border p-5 print:hidden">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica checkpoint" : "Nuovo checkpoint"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome (IT)" v={form.nameIt} on={(v) => setForm({ ...form, nameIt: v })} />
          <F label="Nome (EN)" v={form.nameEn} on={(v) => setForm({ ...form, nameEn: v })} />
          <F label="Punti" v={form.points} on={(v) => setForm({ ...form, points: v })} />
          <label className="text-sm">Badge (opzionale)
            <select value={form.badgeId} onChange={(e) => setForm({ ...form, badgeId: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2">
              <option value="">— nessuno —</option>
              {badges.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name.it}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Attivo
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-gdg-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy || !form.nameIt}>{form.id ? "Salva" : "Aggiungi"}</Button>
          {form.id && <Button variant="ghost" onClick={() => setForm(EMPTY)}>Annulla</Button>}
        </div>
      </div>
    </div>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="text-sm">{label}
      <input value={v} onChange={(e) => on(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
    </label>
  );
}
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm build` → routes present. `pnpm build:static` → succeeds. `pnpm lint` → clean.
```bash
git add src/app/api/admin/checkpoints/route.ts "src/app/[locale]/admin/checkpoints/page.tsx" src/components/admin/CheckpointsAdmin.tsx package.json pnpm-lock.yaml
git commit -m "feat: admin checkpoints CRUD + printable QR (qrcode)"
```

---

## Task 7: `/api/scan` — validated, idempotent award

**Files:**
- Create: `src/app/api/scan/route.ts`

**Interfaces:**
- Consumes: `verifyUser` (`@/lib/auth/user-guard`), `getAdminDb`, `validateScan`/`awardForScan`/`MilestoneBadge`/`GameProfile` (`@/lib/gamification`).
- Produces: `POST /api/scan` `{ checkpointId, token }` → `{ ok, already?, awarded? }`.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";
import { awardForScan, validateScan, type GameProfile, type MilestoneBadge } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const checkpointId = body?.checkpointId;
  const token = body?.token;
  if (typeof checkpointId !== "string" || typeof token !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const cpSnap = await db.collection("checkpoints").doc(checkpointId).get();
  const cp = cpSnap.exists ? (cpSnap.data() as { active: boolean; secret: string; points: number; badgeId?: string }) : null;
  const verdict = validateScan(cp, token);
  if (verdict !== "ok") {
    const status = verdict === "not-found" ? 404 : 403;
    return NextResponse.json({ ok: false, reason: verdict }, { status });
  }

  // Milestone badges = badges with a `milestone` field.
  const badgeSnap = await db.collection("badges").where("milestone", ">", 0).get();
  const milestones: MilestoneBadge[] = badgeSnap.docs.map((d) => ({ id: d.id, milestone: d.data().milestone as number }));

  const scanRef = db.collection("gameProfiles").doc(uid).collection("scans").doc(checkpointId);
  const profileRef = db.collection("gameProfiles").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const scanDoc = await tx.get(scanRef);
    if (scanDoc.exists) return { already: true as const };
    const profDoc = await tx.get(profileRef);
    const current: GameProfile = profDoc.exists
      ? { points: profDoc.data()!.points ?? 0, badgeIds: profDoc.data()!.badgeIds ?? [], scanCount: profDoc.data()!.scanCount ?? 0 }
      : { points: 0, badgeIds: [], scanCount: 0 };
    const next = awardForScan(current, { points: cp!.points, badgeId: cp!.badgeId }, milestones);
    tx.set(scanRef, { at: FieldValue.serverTimestamp(), points: cp!.points });
    tx.set(profileRef, next, { merge: true });
    const newBadgeIds = next.badgeIds.filter((b) => !current.badgeIds.includes(b));
    return { already: false as const, awarded: { points: cp!.points, newBadgeIds, total: next.points } };
  });

  if (result.already) return NextResponse.json({ ok: true, already: true });

  // Best-effort leaderboard sync if the user opted in.
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const u = userDoc.data();
    if (u?.leaderboardOptIn && u?.displayName) {
      await db.collection("leaderboard").doc(uid).set({ displayName: u.displayName, points: result.awarded!.total });
    }
  } catch {
    // leaderboard is non-critical; never fail the scan over it
  }

  return NextResponse.json({ ok: true, awarded: result.awarded });
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm build` → `/api/scan` present. `pnpm lint` → clean.
Run: `pnpm build && (pnpm start -p 3100 &) && sleep 4` then `curl -s -o /dev/null -w "%{http_code}\n" -XPOST localhost:3100/api/scan -H 'content-type: application/json' -d '{"checkpointId":"x","token":"y"}'` → expect `401` (no auth token). Then `pkill -f "next start" || true`. (401 before any DB work confirms the guard.)
```bash
git add src/app/api/scan/route.ts
git commit -m "feat: /api/scan — verifyUser + idempotent transactional award"
```

---

## Task 8: Scanner page `/play/scan` + `play` i18n

**Files:**
- Create: `src/components/play/Scanner.tsx`
- Create: `src/app/[locale]/play/scan/page.tsx`
- Modify: `messages/it.json`, `messages/en.json` (add `play` namespace)
- Modify: `package.json` (add `jsqr`)

**Interfaces:**
- Consumes: `userFetch` (`@/lib/user-client`), `parseQrPayload` (`@/lib/gamification`), `useAuth`, `jsqr`.

- [ ] **Step 1: Install jsqr**

Run: `pnpm add jsqr`

- [ ] **Step 2: Add `play` keys to BOTH message files**

en:
```json
"play": {
  "title": "DevFest Quest", "points": "{points} points", "scan": "Scan a checkpoint",
  "scanning": "Point your camera at a DevFest QR code…", "noCamera": "No camera available.",
  "denied": "Camera permission denied. Enable it in your browser settings.",
  "invalidQr": "That isn't a DevFest Quest code.", "already": "Already scanned ✓",
  "awarded": "+{points} points!", "newBadge": "New badge unlocked!", "signIn": "Sign in to play",
  "badges": "Badges", "leaderboard": "Leaderboard", "rank": "Rank", "you": "You",
  "optIn": "Show me on the leaderboard", "displayName": "Display name", "save": "Save", "saved": "Saved ✓",
  "locked": "Locked", "noBadges": "No badges yet — start scanning!", "emptyBoard": "No players yet."
}
```
it:
```json
"play": {
  "title": "DevFest Quest", "points": "{points} punti", "scan": "Scansiona un checkpoint",
  "scanning": "Inquadra un codice QR DevFest…", "noCamera": "Nessuna fotocamera disponibile.",
  "denied": "Permesso fotocamera negato. Abilitalo nelle impostazioni del browser.",
  "invalidQr": "Questo non è un codice DevFest Quest.", "already": "Già scansionato ✓",
  "awarded": "+{points} punti!", "newBadge": "Nuovo badge sbloccato!", "signIn": "Accedi per giocare",
  "badges": "Badge", "leaderboard": "Classifica", "rank": "Pos.", "you": "Tu",
  "optIn": "Mostrami in classifica", "displayName": "Nome visualizzato", "save": "Salva", "saved": "Salvato ✓",
  "locked": "Bloccato", "noBadges": "Ancora nessun badge — inizia a scansionare!", "emptyBoard": "Ancora nessun giocatore."
}
```

- [ ] **Step 3: Scanner component `src/components/play/Scanner.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import jsQR from "jsqr";
import { useAuth } from "@/hooks/useAuth";
import { userFetch } from "@/lib/user-client";
import { parseQrPayload } from "@/lib/gamification";
import { Button } from "@/components/ui/button";

type Result = { kind: "awarded"; points: number; newBadge: boolean } | { kind: "already" } | { kind: "error"; msg: string };

export function Scanner() {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!user) return;
    let raf = 0;
    let stream: MediaStream | null = null;
    let active = true;
    const canvas = document.createElement("canvas");

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setResult({ kind: "error", msg: t("noCamera") }); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setScanning(true);
        const tick = () => {
          if (!active || video.readyState !== video.HAVE_ENOUGH_DATA) { raf = requestAnimationFrame(tick); return; }
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code) { void onDecode(code.data); return; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setResult({ kind: "error", msg: t("denied") });
      }
    }

    async function onDecode(text: string) {
      const parsed = parseQrPayload(text);
      if (!parsed) { setResult({ kind: "error", msg: t("invalidQr") }); raf = requestAnimationFrame(() => {}); stop(); return; }
      stop();
      const res = await userFetch("/api/scan", { method: "POST", body: JSON.stringify(parsed) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.already) setResult({ kind: "already" });
      else if (res.ok && data.awarded) setResult({ kind: "awarded", points: data.awarded.points, newBadge: data.awarded.newBadgeIds?.length > 0 });
      else setResult({ kind: "error", msg: t("invalidQr") });
    }

    function stop() {
      active = false; setScanning(false);
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    }
    stopRef.current = stop;
    void start();
    return () => stop();
  }, [user, t]);

  if (!enabled) return <Shell><p className="text-muted-foreground">{t("signIn")}</p></Shell>;
  if (!user) return <Shell><Button onClick={() => void signIn()}>{t("signIn")}</Button></Shell>;

  return (
    <Shell>
      {!result && (
        <>
          <video ref={videoRef} playsInline muted className="mx-auto aspect-square w-full max-w-sm rounded-2xl bg-black object-cover" />
          <p className="mt-3 text-sm text-muted-foreground">{scanning ? t("scanning") : "…"}</p>
        </>
      )}
      {result?.kind === "awarded" && (
        <div className="rounded-2xl border border-border p-8">
          <p className="font-display text-3xl font-bold text-gdg-green">{t("awarded", { points: result.points })}</p>
          {result.newBadge && <p className="mt-2">{t("newBadge")}</p>}
          <Button className="mt-4" onClick={() => location.reload()}>{t("scan")}</Button>
        </div>
      )}
      {result?.kind === "already" && <Retry msg={t("already")} label={t("scan")} />}
      {result?.kind === "error" && <Retry msg={result.msg} label={t("scan")} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">DevFest Quest</h1>
      {children}
    </section>
  );
}
function Retry({ msg, label }: { msg: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border p-8">
      <p className="text-lg">{msg}</p>
      <Button className="mt-4" onClick={() => location.reload()}>{label}</Button>
    </div>
  );
}
```

- [ ] **Step 4: Page `src/app/[locale]/play/scan/page.tsx`**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Scanner } from "@/components/play/Scanner";

export const metadata: Metadata = { robots: { index: false } };

export default async function ScanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Scanner />;
}
```

- [ ] **Step 5: Verify + commit**

Run: JSON parse both message files (`node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/it.json','utf8'));console.log('ok')"`). `pnpm build` → `/play/scan` present. `pnpm build:static` → succeeds (renders signed-out; no camera). `pnpm lint` → clean.
```bash
git add src/components/play/Scanner.tsx "src/app/[locale]/play/scan/page.tsx" messages/en.json messages/it.json package.json pnpm-lock.yaml
git commit -m "feat: /play/scan in-app QR scanner (jsqr) + play i18n"
```

---

## Task 9: `/api/play/profile` — prefs + leaderboard sync

**Files:**
- Create: `src/app/api/play/profile/route.ts`

**Interfaces:**
- Consumes: `verifyUser`, `getAdminDb`.
- Produces: `POST /api/play/profile` `{ displayName?, leaderboardOptIn }`.

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });

  const optIn = body.leaderboardOptIn === true;
  const displayName = typeof body.displayName === "string"
    ? body.displayName.replace(/[ -]/g, "").trim().slice(0, 40)
    : "";
  if (optIn && !displayName) return NextResponse.json({ ok: false, reason: "name-required" }, { status: 400 });

  await db.collection("users").doc(uid).set({ displayName, leaderboardOptIn: optIn }, { merge: true });

  const lbRef = db.collection("leaderboard").doc(uid);
  if (optIn) {
    const prof = await db.collection("gameProfiles").doc(uid).get();
    await lbRef.set({ displayName, points: prof.data()?.points ?? 0 });
  } else {
    await lbRef.delete().catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm build` → `/api/play/profile` present. `pnpm lint` → clean.
```bash
git add src/app/api/play/profile/route.ts
git commit -m "feat: /api/play/profile — prefs + leaderboard opt-in sync"
```

---

## Task 10: `/play` home — points, badge wall, opt-in

**Files:**
- Create: `src/components/play/PlayHome.tsx`
- Create: `src/app/[locale]/play/page.tsx`

**Interfaces:**
- Consumes: `useAuth`, `getDb` (`@/lib/firebase/client`), `userFetch`, `getBadges` (server, via page), `play` i18n, `localized`.
- Produces: the `/play` route.

- [ ] **Step 1: Server page passes the public badge catalog to a client component**

`src/app/[locale]/play/page.tsx`:
```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getBadges } from "@/lib/data/game";
import { PlayHome } from "@/components/play/PlayHome";

export const metadata: Metadata = { robots: { index: false } };

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const badges = await getBadges();
  return <PlayHome badges={badges} />;
}
```

- [ ] **Step 2: Client `src/components/play/PlayHome.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { userFetch } from "@/lib/user-client";
import { localized } from "@/lib/localize";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Badge } from "@/lib/data/game";

export function PlayHome({ badges }: { badges: Badge[] }) {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const locale = useLocale();
  const [points, setPoints] = useState(0);
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!user || !db) return;
    const unsubP = onSnapshot(doc(db, "gameProfiles", user.uid), (d) => {
      setPoints(d.data()?.points ?? 0);
      setHeld(new Set<string>(d.data()?.badgeIds ?? []));
    });
    const unsubU = onSnapshot(doc(db, "users", user.uid), (d) => {
      if (d.data()?.displayName != null) setName(d.data()!.displayName);
      setOptIn(d.data()?.leaderboardOptIn === true);
    });
    return () => { unsubP(); unsubU(); };
  }, [user]);

  async function saveProfile() {
    setSaved(false);
    const res = await userFetch("/api/play/profile", { method: "POST", body: JSON.stringify({ displayName: name, leaderboardOptIn: optIn }) });
    if (res.ok) setSaved(true);
  }

  if (!enabled || !user) {
    return (
      <Section>
        <p className="mb-4 text-muted-foreground">{t("signIn")}</p>
        {enabled && <Button onClick={() => void signIn()}>{t("signIn")}</Button>}
      </Section>
    );
  }

  return (
    <Section>
      <p className="font-display text-5xl font-bold text-gdg-blue">{t("points", { points })}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button asChild><Link href="/play/scan">{t("scan")}</Link></Button>
        <Button asChild variant="outline"><Link href="/play/leaderboard">{t("leaderboard")}</Link></Button>
      </div>

      <h2 className="mb-3 mt-10 text-left font-display text-xl font-bold">{t("badges")}</h2>
      {badges.length === 0 ? (
        <p className="text-left text-muted-foreground">{t("noBadges")}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {badges.map((b) => {
            const has = held.has(b.id);
            return (
              <li key={b.id} className={`rounded-2xl border border-border p-3 text-center ${has ? "" : "opacity-40 grayscale"}`}>
                <div className="text-3xl">{b.icon}</div>
                <div className="mt-1 text-xs font-medium">{localized(b.name, locale)}</div>
                <div className="text-[0.65rem] text-muted-foreground">{has ? localized(b.description, locale) : t("locked")}</div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 rounded-2xl border border-border p-5 text-left">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} /> {t("optIn")}
        </label>
        <label className="mt-3 block text-sm">{t("displayName")}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
        </label>
        <Button className="mt-3" size="sm" onClick={saveProfile} disabled={optIn && !name.trim()}>{t("save")}</Button>
        {saved && <span className="ml-2 text-sm text-gdg-green">{t("saved")}</span>}
      </div>
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8"><h1 className="mb-6 font-display text-3xl font-bold tracking-tight">DevFest Quest</h1>{children}</section>;
}
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm build` → `/play` present. `pnpm build:static` → succeeds. `pnpm lint` → clean.
```bash
git add "src/app/[locale]/play/page.tsx" src/components/play/PlayHome.tsx
git commit -m "feat: /play home — points, badge wall, leaderboard opt-in"
```

---

## Task 11: `/play/leaderboard`

**Files:**
- Create: `src/components/play/Leaderboard.tsx`
- Create: `src/app/[locale]/play/leaderboard/page.tsx`

**Interfaces:**
- Consumes: `getDb`, `useAuth`, `play` i18n, `firebase/firestore` (`collection`, `query`, `orderBy`, `limit`, `onSnapshot`).

- [ ] **Step 1: Client `src/components/play/Leaderboard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string; displayName: string; points: number };

export function Leaderboard() {
  const t = useTranslations("play");
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, "leaderboard"), orderBy("points", "desc"), limit(50));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Row, "id">) }))));
  }, []);

  return (
    <section className="mx-auto max-w-xl px-5 py-16 sm:px-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">{t("leaderboard")}</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("emptyBoard")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className={`flex items-center justify-between rounded-2xl border border-border px-4 py-3 ${r.id === user?.uid ? "border-gdg-blue bg-gdg-blue/5" : ""}`}>
              <span className="flex items-center gap-3">
                <span className="w-6 font-mono text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{r.displayName}{r.id === user?.uid && ` (${t("you")})`}</span>
              </span>
              <span className="font-display font-bold">{r.points}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Page `src/app/[locale]/play/leaderboard/page.tsx`**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Leaderboard } from "@/components/play/Leaderboard";

export const metadata: Metadata = { robots: { index: false } };

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Leaderboard />;
}
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm build` → `/play/leaderboard` present. `pnpm build:static` → succeeds. `pnpm lint` → clean.
```bash
git add "src/app/[locale]/play/leaderboard/page.tsx" src/components/play/Leaderboard.tsx
git commit -m "feat: /play/leaderboard (public opt-in board, live)"
```

---

## Task 12: "DevFest Quest" header button

**Files:**
- Modify: `src/components/auth/AuthButton.tsx` (OR `Header.tsx`) — show a Quest link when signed in

**Interfaces:**
- Consumes: `useAuth`, `Link`, `play` i18n.

- [ ] **Step 1: Add a Quest link in the Header controls cluster, signed-in only**

In `src/components/layout/Header.tsx`, create a small client subcomponent OR reuse `useAuth`. Header is already a client component. Add an import for `useAuth` and the i18n `play` namespace at the top, then render — in the desktop controls cluster (right before `<AuthButton />`) and in the mobile menu controls — a Quest link gated on the signed-in user:
```tsx
// near other imports
import { useAuth } from "@/hooks/useAuth";
// inside Header(), with the other hooks:
const { user } = useAuth();
const tPlay = useTranslations("play");
// desktop cluster, before <AuthButton />:
{user && (
  <Link href="/play" className="hidden rounded-full px-3 py-2 text-sm font-medium text-gdg-blue hover:bg-muted sm:inline-flex">
    {tPlay("title")}
  </Link>
)}
// mobile footer controls (left group), after ThemeToggle/AuthButton as appropriate:
{user && (
  <Link href="/play" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-sm font-medium text-gdg-blue hover:bg-muted">
    {tPlay("title")}
  </Link>
)}
```
(`Link` from `@/i18n/navigation` is already imported in Header; `useTranslations` already imported.)

- [ ] **Step 2: Verify + commit**

Run: `pnpm build` → succeeds. `pnpm lint` → clean.
```bash
git add src/components/layout/Header.tsx
git commit -m "feat: DevFest Quest header link (signed-in)"
```

---

# 3B — Live feedback

## Task 13: `/api/feedback` route

**Files:**
- Create: `src/app/api/feedback/route.ts`

**Interfaces:**
- Consumes: `verifyUser`, `getAdminDb`, `FieldValue`.
- Produces: `POST /api/feedback` `{ sessionId, rating, comment? }`.

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  if (typeof sessionId !== "string" || !sessionId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  await db.collection("feedback").doc(sessionId).collection("responses").doc(uid).set(
    { rating, comment, at: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm build` → `/api/feedback` present. `pnpm lint` → clean.
Run a quick auth-guard curl as in Task 7 (expect 401 without a token), then stop the server.
```bash
git add src/app/api/feedback/route.ts
git commit -m "feat: /api/feedback — verifyUser, one validated response per user/session"
```

---

## Task 14: `FeedbackForm` in `SessionCard`

**Files:**
- Create: `src/components/feedback/FeedbackForm.tsx`
- Modify: `src/components/agenda/SessionCard.tsx`

**Interfaces:**
- Consumes: `useAuth`, `getDb`, `userFetch`, `play` i18n, `firebase/firestore` (`doc`, `getDoc`).

- [ ] **Step 1: Add feedback i18n keys to BOTH message files** (extend the `play` namespace)

en (add inside `play`): `"rate": "Rate this session", "yourRating": "Your rating", "comment": "Comment (optional)", "submitRating": "Submit", "thanks": "Thanks for your feedback!"`
it: `"rate": "Valuta questa sessione", "yourRating": "Il tuo voto", "comment": "Commento (facoltativo)", "submitRating": "Invia", "thanks": "Grazie per il tuo feedback!"`

- [ ] **Step 2: Component `src/components/feedback/FeedbackForm.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { userFetch } from "@/lib/user-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FeedbackForm({ sessionId }: { sessionId: string }) {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!user || !db || !open) return;
    getDoc(doc(db, "feedback", sessionId, "responses", user.uid)).then((d) => {
      if (d.exists()) { setRating(d.data().rating ?? 0); setComment(d.data().comment ?? ""); }
    });
  }, [user, open, sessionId]);

  if (!enabled) return null;

  async function submit() {
    const res = await userFetch("/api/feedback", { method: "POST", body: JSON.stringify({ sessionId, rating, comment }) });
    if (res.ok) setDone(true);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-left text-sm font-medium text-gdg-blue hover:underline">
        {t("rate")}
      </button>
    );
  }
  if (!user) {
    return <div className="mt-2"><Button size="sm" variant="outline" onClick={() => void signIn()}>{t("signIn")}</Button></div>;
  }
  if (done) return <p className="mt-2 text-sm text-gdg-green">{t("thanks")}</p>;

  return (
    <div className="mt-2 rounded-xl border border-border p-3">
      <p className="mb-1 text-sm font-medium">{t("yourRating")}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n}`} onClick={() => setRating(n)}>
            <Star className={cn("size-6", n <= rating ? "fill-gdg-yellow text-gdg-yellow" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t("comment")}
        className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" rows={2} />
      <Button size="sm" className="mt-2" onClick={submit} disabled={rating < 1}>{t("submitRating")}</Button>
    </div>
  );
}
```

- [ ] **Step 3: Mount it in `SessionCard.tsx`** (non-service, after the add-to-calendar block ~line 117)

Add import `import { FeedbackForm } from "@/components/feedback/FeedbackForm";` and, after the `AddToCalendar` block, before the tags block:
```tsx
{!service && <FeedbackForm sessionId={session.id} />}
```

- [ ] **Step 4: Verify + commit**

Run: JSON parse both message files. `pnpm build` → succeeds. `pnpm build:static` → succeeds. `pnpm lint` → clean.
```bash
git add src/components/feedback/FeedbackForm.tsx src/components/agenda/SessionCard.tsx messages/en.json messages/it.json
git commit -m "feat: per-session FeedbackForm (rating + comment) on SessionCard"
```

---

# 3C — Organizer dashboard

## Task 15: `/api/admin/dashboard` aggregate route

**Files:**
- Create: `src/app/api/admin/dashboard/route.ts`

**Interfaces:**
- Consumes: `verifyAdmin`, `getAdminDb`, `aggregate` (`@/lib/feedback-stats`), `getSessions` (`@/lib/data/content`), `getSubscriberRows` (`@/lib/data/subscribers`), `getCheckpoints`/`getBadges` (`@/lib/data/game`).
- Produces: `GET /api/admin/dashboard` → aggregated payload.

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { aggregate } from "@/lib/feedback-stats";
import { getSessions } from "@/lib/data/content";
import { getSubscriberRows } from "@/lib/data/subscribers";
import { getBadges, getCheckpoints } from "@/lib/data/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const [sessions, subscribers, checkpoints, badges] = await Promise.all([
    getSessions(), getSubscriberRows(), getCheckpoints(), getBadges(),
  ]);

  // Feedback per session.
  const feedback = [];
  for (const s of sessions.filter((x) => !x.isServiceSession)) {
    const snap = await db.collection("feedback").doc(s.id).collection("responses").get();
    if (snap.empty) continue;
    const responses = snap.docs.map((d) => ({ rating: d.data().rating as number, comment: d.data().comment as string | undefined }));
    const agg = aggregate(responses);
    feedback.push({ sessionId: s.id, title: s.title, count: agg.count, average: agg.average, distribution: agg.distribution, comments: agg.comments });
  }

  // Gamification: scans per checkpoint + badge distribution + top leaderboard + players.
  const profiles = await db.collection("gameProfiles").get();
  const badgeCounts: Record<string, number> = {};
  let players = 0;
  profiles.forEach((p) => {
    players++;
    for (const b of (p.data().badgeIds ?? []) as string[]) badgeCounts[b] = (badgeCounts[b] ?? 0) + 1;
  });
  const scanCounts: Record<string, number> = {};
  for (const c of checkpoints) {
    // count scan docs across players for this checkpoint via collectionGroup
    scanCounts[c.id] = 0;
  }
  const scansCG = await db.collectionGroup("scans").get();
  scansCG.forEach((d) => { const id = d.id; scanCounts[id] = (scanCounts[id] ?? 0) + 1; });
  const lb = await db.collection("leaderboard").orderBy("points", "desc").limit(10).get();
  const leaderboard = lb.docs.map((d) => ({ displayName: d.data().displayName as string, points: d.data().points as number }));

  return NextResponse.json({
    ok: true,
    subscribers: subscribers.length,
    feedback,
    game: {
      players,
      checkpoints: checkpoints.map((c) => ({ id: c.id, name: c.name, scans: scanCounts[c.id] ?? 0 })),
      badges: badges.map((b) => ({ id: b.id, name: b.name, icon: b.icon, holders: badgeCounts[b.id] ?? 0 })),
      leaderboard,
    },
  });
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm build` → `/api/admin/dashboard` present. `pnpm lint` → clean.
```bash
git add src/app/api/admin/dashboard/route.ts
git commit -m "feat: /api/admin/dashboard aggregate (feedback + game + subscribers)"
```

---

## Task 16: `/admin/dashboard` UI + nav (default landing)

**Files:**
- Create: `src/app/[locale]/admin/dashboard/page.tsx`
- Create: `src/components/admin/Dashboard.tsx`
- Modify: `src/app/[locale]/admin/layout.tsx` (add Cruscotto/Checkpoint/Badge nav links; Cruscotto first)
- Modify: `src/app/[locale]/admin/page.tsx` if one exists (else add a redirect) — make `/admin` land on the dashboard

**Interfaces:**
- Consumes: `adminFetch`, `localized`, `play`-free (IT inline).

- [ ] **Step 1: Add nav links + dashboard-first in `admin/layout.tsx`**

Update the `SECTIONS` array to:
```tsx
const SECTIONS = [
  { href: "/admin/dashboard", label: "Cruscotto" },
  { href: "/admin/checkpoints", label: "Checkpoint" },
  { href: "/admin/badges", label: "Badge" },
  { href: "/admin/sponsors", label: "Sponsor" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/subscribers", label: "Iscritti" },
  { href: "/admin/config", label: "Configurazione" },
];
```

- [ ] **Step 2: Make `/admin` redirect to the dashboard** — create `src/app/[locale]/admin/page.tsx`:
```tsx
import { redirect } from "@/i18n/navigation";

export default async function AdminIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/admin/dashboard", locale });
}
```
(`redirect` is exported from `@/i18n/navigation` — it's `createNavigation(routing)`'s locale-aware redirect, signature `redirect({ href, locale })`. Confirmed present.)

- [ ] **Step 3: Dashboard page `src/app/[locale]/admin/dashboard/page.tsx`**

```tsx
import { Dashboard } from "@/components/admin/Dashboard";
export const dynamic = "force-dynamic";
export default function AdminDashboardPage() {
  return <Dashboard />;
}
```

- [ ] **Step 4: Client `src/components/admin/Dashboard.tsx`** (IT inline; CSS bars, no chart lib)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { adminFetch } from "@/lib/admin-client";
import { localized } from "@/lib/localize";
import type { LocalizedString } from "@/types/models";

type Data = {
  subscribers: number;
  feedback: { sessionId: string; title: string; count: number; average: number; distribution: number[]; comments: string[] }[];
  game: {
    players: number;
    checkpoints: { id: string; name: LocalizedString; scans: number }[];
    badges: { id: string; name: LocalizedString; icon: string; holders: number }[];
    leaderboard: { displayName: string; points: number }[];
  };
};

export function Dashboard() {
  const locale = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/dashboard")
      .then(async (r) => (r.ok ? ((await r.json()) as Data) : Promise.reject(r.status)))
      .then(setData)
      .catch((s) => setError(`Errore (${s}).`));
  }, []);

  if (error) return <p className="text-sm text-gdg-red">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Caricamento…</p>;

  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Iscritti" value={data.subscribers} />
        <Stat label="Giocatori" value={data.game.players} />
        <Stat label="Checkpoint" value={data.game.checkpoints.length} />
        <Stat label="Sessioni valutate" value={data.feedback.length} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Feedback sessioni</h2>
        {data.feedback.length === 0 ? <p className="text-muted-foreground">Nessun feedback.</p> : (
          <div className="flex flex-col gap-4">
            {data.feedback.map((f) => (
              <div key={f.sessionId} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{f.title}</p>
                  <p className="font-display font-bold">{f.average} ★ <span className="text-sm font-normal text-muted-foreground">({f.count})</span></p>
                </div>
                <div className="mt-2 flex gap-1">
                  {f.distribution.map((n, i) => (
                    <div key={i} className="flex-1 text-center text-[0.65rem] text-muted-foreground">
                      <div className="mx-auto w-full rounded bg-gdg-blue/20" style={{ height: `${8 + n * 12}px` }} />
                      {i + 1}★
                    </div>
                  ))}
                </div>
                {f.comments.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                    {f.comments.map((c, i) => <li key={i} className="border-l-2 border-border pl-2">“{c}”</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Checkpoint — scansioni</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {data.game.checkpoints.map((c) => (
              <li key={c.id} className="flex justify-between border-t border-border py-1"><span>{localized(c.name, locale)}</span><span className="font-mono">{c.scans}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Badge — possessori</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {data.game.badges.map((b) => (
              <li key={b.id} className="flex justify-between border-t border-border py-1"><span>{b.icon} {localized(b.name, locale)}</span><span className="font-mono">{b.holders}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Classifica (top 10)</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {data.game.leaderboard.map((r, i) => (
            <li key={i} className="flex justify-between border-t border-border py-1"><span>{i + 1}. {r.displayName}</span><span className="font-mono">{r.points}</span></li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border p-4 text-center">
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm build` → `/admin/dashboard` present, `/admin` redirects. `pnpm build:static` → succeeds (admin stripped). `pnpm lint` → clean. `pnpm test` → all green.
```bash
git add "src/app/[locale]/admin/dashboard/page.tsx" src/components/admin/Dashboard.tsx "src/app/[locale]/admin/layout.tsx" "src/app/[locale]/admin/page.tsx"
git commit -m "feat: organizer dashboard (/admin/dashboard) + admin nav"
```

---

## Task 17: Docs — README + STATUS

**Files:**
- Modify: `README.md`, `docs/STATUS.md`

- [ ] **Step 1: README** — add to the Admin section: Checkpoint + Badge management and the Cruscotto (dashboard); add a "DevFest Quest" bullet under Phase 3 explaining the QR-scan game (admin prints checkpoint QR codes, attendees scan in-app at `/play`, points/badges/leaderboard) and per-session feedback. Add `jsqr`/`qrcode` to the stack line if one lists deps.

- [ ] **Step 2: STATUS** — add a `### ✅ Batch 3` block: gamification (checkpoints/badges admin + printable QR, in-app scanner, server-awarded points/badges in `gameProfiles`, opt-in leaderboard), live feedback (per-session rating+comment, anonymous-to-organizers), organizer dashboard. Move Phase 3 items out of Pending. Note physical QR placement + a live Firebase project are the remaining go-live ops.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/STATUS.md
git commit -m "docs: Batch 3 (quest, feedback, dashboard) in README + STATUS"
```

---

## Verification checklist (before declaring Batch 3 complete)

- [ ] `pnpm test` — user-guard, gamification, feedback-stats suites green (+ all prior).
- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — routes include `/play`, `/play/scan`, `/play/leaderboard`, `/admin/{checkpoints,badges,dashboard}`, `/api/{scan,feedback,play/profile,admin/checkpoints,admin/badges,admin/dashboard}`.
- [ ] `pnpm build:static` — succeeds; all `/api/*` + `/admin/*` stripped; `/play/*` render a signed-out state (no Firebase, no camera) without error.
- [ ] Security: no `/api/scan`, `/api/feedback`, `/api/play/profile` path awards/writes without a valid `verifyUser`; `gameProfiles`/`leaderboard` are client-read-only (rules `write: if false`); checkpoint `secret` never sent to non-admins.
- [ ] Manual (go-live, needs Firebase + a phone): admin creates badge + checkpoint → print QR → `/play/scan` awards points once (re-scan = already) → milestone badge at threshold → opt into leaderboard → ranked → rate a session → `/admin/dashboard` shows the aggregate.
- [ ] Both locales render `play` copy.
