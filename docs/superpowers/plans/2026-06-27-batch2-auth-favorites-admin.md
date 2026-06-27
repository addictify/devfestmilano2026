# Batch 2 (Login · Favorites · Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google sign-in UI, a personal "My Schedule" favorites system (localStorage + Firestore with merge-on-login), and an IT-only claim-gated admin for sponsors/team/subscribers/config.

**Architecture:** Pure modules (`favorites.ts`, `csv.ts`, `settings.ts` merge, `admin-guard.ts` decision) are unit-tested with Vitest. Thin React/route layers consume them. Auth UI is a pure consumer of the existing `useAuth`. Favorites persist client-side (localStorage signed-out, Firestore owner-scoped signed-in). Admin mutations go through claim-gated `/api/admin/*` server routes (Admin SDK + ID-token verification); the admin UI is IT-only inline copy. A small `getSiteSettings()` + `SiteSettingsProvider` makes the three feature flags runtime-toggleable.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, next-intl, Firebase (client Auth/Firestore + Admin SDK), Radix dropdown/dialog, lucide-react, Vitest, `tsx` (new devDep, for the set-admin script).

## Global Constraints

- Next.js 16 App Router — `params` is a Promise; read `node_modules/next/dist/docs/` before unfamiliar APIs.
- Path alias `@/*` → `./src/*`.
- i18n: next-intl, locales `["it","en"]`, prefix always, messages at repo-root `messages/{it,en}.json`. New PUBLIC copy (`auth`, `myschedule` namespaces) goes in BOTH files. Admin copy is **IT-only inline constants** in the admin components — NOT added to the message files.
- Two build modes: server (Vercel) and `STATIC_EXPORT=1` (GitHub Pages, `output: export`, `trailingSlash: true`). `scripts/static-build.sh` strips `src/app/api` before export. Every feature must degrade (auth signed-out, favorites localStorage-only, admin absent), never break the build. API routes that need a server set `export const dynamic = "force-dynamic"`.
- Firebase may be unconfigured (seed mode): client `getDb()`/`getFirebaseAuth()` → null, `isFirebaseConfigured` false; Admin `getAdminDb()` → null, `isAdminConfigured` false. Handle null everywhere.
- Admin access = Firebase custom claim `admin === true`, settable ONLY via Admin SDK (the `set-admin` script). Existing Firestore rules already gate `sponsors`/`team`/`config` writes and `subscribers` reads on `isAdmin()`, and `users/{uid}/{sub=**}` on owner — NO rule changes needed.
- Existing helpers: `useAuth()` → `{ user, loading, enabled, signIn, signOut }` (`@/hooks/useAuth`); `getDb()`/`getFirebaseAuth()`/`isFirebaseConfigured` (`@/lib/firebase/client`); `getAdminDb()`/`isAdminConfigured` (`@/lib/firebase/admin`); `Button`/`buttonVariants` (`@/components/ui/button`, sizes `sm|md|lg|icon`, variants `primary|accent|outline|ghost|link`); `cn` (`@/lib/utils`); `localized` (`@/lib/localize`); `Link` (`@/i18n/navigation`); `SessionCard` (`@/components/agenda/SessionCard`); `AddToCalendar` (`@/components/common/AddToCalendar`); GDG tokens (`@/lib/design/tokens`); `siteConfig` (`@/lib/site`).
- Radix dropdown pattern reference: `src/components/layout/LanguageSwitcher.tsx`.
- Commit after every task. Branch `batch2-auth-favorites-admin` (already checked out, off `main` which includes Batch 1). No push.

---

# 2A — Login UI

## Task 1: `AuthButton` component + auth i18n

**Files:**
- Create: `src/components/auth/AuthButton.tsx`
- Modify: `messages/it.json`, `messages/en.json` (add `auth` namespace)

**Interfaces:**
- Consumes: `useAuth` (`@/hooks/useAuth`), `Button` (`@/components/ui/button`), `@radix-ui/react-dropdown-menu`, `next/image`, lucide `LogOut`/`User`/`CalendarHeart`.
- Produces: named export `AuthButton` (no props).

- [ ] **Step 1: Add `auth` keys to BOTH message files**

`messages/en.json` add top-level:
```json
"auth": { "signIn": "Sign in", "signOut": "Sign out", "account": "Account menu", "myschedule": "My schedule", "signedInAs": "Signed in as" },
```
`messages/it.json` add top-level:
```json
"auth": { "signIn": "Accedi", "signOut": "Esci", "account": "Menu account", "myschedule": "La mia agenda", "signedInAs": "Accesso come" },
```

- [ ] **Step 2: Implement `src/components/auth/AuthButton.tsx`**

```tsx
"use client";

import Image from "next/image";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { LogOut, CalendarHeart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(name: string | null, email: string | null): string {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AuthButton() {
  const { user, loading, enabled, signIn, signOut } = useAuth();
  const t = useTranslations("auth");

  if (!enabled) return null;
  if (loading) {
    return <span aria-hidden className="inline-block size-9 rounded-full bg-muted" />;
  }
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => void signIn()}>
        {t("signIn")}
      </Button>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("account")}
        className={cn(
          "inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold transition-colors hover:bg-muted",
        )}
      >
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName ?? "account"} width={36} height={36} className="size-9 object-cover" />
        ) : (
          <span>{initials(user.displayName, user.email)}</span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl data-[state=open]:animate-[acc-down_0.15s_ease]"
        >
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("signedInAs")}</p>
            <p className="truncate text-sm font-medium">{user.displayName ?? user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/my-schedule"
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              <CalendarHeart className="size-4 text-muted-foreground" />
              {t("myschedule")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => void signOut()}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
          >
            <LogOut className="size-4 text-muted-foreground" />
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

- [ ] **Step 3: Verify**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/it.json','utf8'));console.log('json ok')"` → `json ok`.
Run: `pnpm lint` → clean for the new file.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AuthButton.tsx messages/en.json messages/it.json
git commit -m "feat: AuthButton (sign-in + avatar dropdown) consuming useAuth"
```

---

## Task 2: Wire `AuthButton` into the Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `AuthButton` (`@/components/auth/AuthButton`).

- [ ] **Step 1: Import and mount in desktop + mobile clusters**

In `Header.tsx`, add import near the other layout imports:
```tsx
import { AuthButton } from "@/components/auth/AuthButton";
```
Desktop cluster — after `<TicketButton size="sm" className="hidden md:inline-flex" />` (line ~89), add:
```tsx
<AuthButton />
```
Mobile menu footer — in the bottom controls row (line ~125-131), change the left group to include it:
```tsx
<div className="flex items-center gap-2">
  <LanguageSwitcher />
  <ThemeToggle />
  <AuthButton />
</div>
```

- [ ] **Step 2: Verify**

Run: `pnpm build` → succeeds (Header compiles).
Run: `pnpm lint` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: mount AuthButton in header (desktop + mobile)"
```

---

# 2B — My Schedule favorites

## Task 3: `favorites.ts` — localStorage serialize + merge (pure, TDD)

**Files:**
- Create: `src/lib/favorites.ts`
- Test: `src/lib/favorites.test.ts`

**Interfaces:**
- Produces: `readLocal(): string[]`, `writeLocal(ids: string[]): void`, `mergeFavorites(local: string[], cloud: string[]): string[]`, const `FAVORITES_LS_KEY = "devfest:favorites"`.

- [ ] **Step 1: Write failing tests**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_LS_KEY, mergeFavorites, readLocal, writeLocal } from "@/lib/favorites";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}
afterEach(() => vi.unstubAllGlobals());

describe("mergeFavorites", () => {
  it("unions and dedups, preserving first-seen order", () => {
    expect(mergeFavorites(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
  it("handles empties", () => {
    expect(mergeFavorites([], ["x"])).toEqual(["x"]);
    expect(mergeFavorites(["x"], [])).toEqual(["x"]);
  });
});

describe("readLocal / writeLocal", () => {
  it("round-trips", () => {
    stubStorage();
    writeLocal(["s1", "s2"]);
    expect(readLocal()).toEqual(["s1", "s2"]);
  });
  it("returns [] on missing", () => {
    stubStorage();
    expect(readLocal()).toEqual([]);
  });
  it("returns [] on corrupt JSON", () => {
    const store = stubStorage();
    store.set(FAVORITES_LS_KEY, "{not json");
    expect(readLocal()).toEqual([]);
  });
  it("returns [] when localStorage is absent (SSR)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readLocal()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/favorites.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/favorites.ts`**

```ts
export const FAVORITES_LS_KEY = "devfest:favorites";

export function readLocal(): string[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(FAVORITES_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeLocal(ids: string[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FAVORITES_LS_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / unavailable
  }
}

/** Unique union, first-seen order preserved (local first, then cloud). */
export function mergeFavorites(local: string[], cloud: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...local, ...cloud]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/favorites.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/favorites.ts src/lib/favorites.test.ts
git commit -m "feat: favorites localStorage serialize + merge helpers"
```

---

## Task 4: `useFavorites` hook + provider (localStorage ↔ Firestore, merge-on-login)

**Files:**
- Create: `src/hooks/useFavorites.tsx`
- Modify: `src/components/providers.tsx` (mount provider)

**Interfaces:**
- Consumes: `favorites.ts` (`readLocal`, `writeLocal`, `mergeFavorites`), `useAuth`, `getDb` (`@/lib/firebase/client`), `firebase/firestore` (`collection`, `onSnapshot`, `doc`, `setDoc`, `deleteDoc`, `writeBatch`, `serverTimestamp`).
- Produces: `FavoritesProvider` and `useFavorites(): { favorites: Set<string>; isFavorite(id: string): boolean; toggle(id: string): void; count: number; ready: boolean }`.

- [ ] **Step 1: Implement `src/hooks/useFavorites.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { mergeFavorites, readLocal, writeLocal } from "@/lib/favorites";

type FavoritesState = {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  ready: boolean;
};

const FavoritesContext = createContext<FavoritesState>({
  favorites: new Set(),
  isFavorite: () => false,
  toggle: () => {},
  count: 0,
  ready: false,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const mergedFor = useRef<string | null>(null);

  // Signed-out: hydrate from localStorage.
  useEffect(() => {
    if (user) return;
    setIds(new Set(readLocal()));
    setReady(true);
  }, [user]);

  // Signed-in: subscribe to Firestore, merging any local favorites once.
  useEffect(() => {
    const db = getDb();
    if (!user || !db) return;
    const col = collection(db, "users", user.uid, "favorites");

    // One-time merge of local → cloud on this sign-in.
    if (mergedFor.current !== user.uid) {
      mergedFor.current = user.uid;
      const local = readLocal();
      if (local.length) {
        const batch = writeBatch(db);
        for (const id of local) {
          batch.set(doc(col, id), { addedAt: serverTimestamp() }, { merge: true });
        }
        batch.commit().then(() => writeLocal([])).catch(() => {});
      }
    }

    const unsub = onSnapshot(col, (snap) => {
      const next = new Set<string>();
      snap.forEach((d) => next.add(d.id));
      // Union with any local ids still pending merge, for instant paint.
      setIds(new Set(mergeFavorites([...next], readLocal())));
      setReady(true);
    });
    return unsub;
  }, [user]);

  const toggle = useCallback(
    (id: string) => {
      const db = getDb();
      setIds((prev) => {
        const next = new Set(prev);
        const has = next.has(id);
        if (has) next.delete(id);
        else next.add(id);

        if (user && db) {
          const ref = doc(db, "users", user.uid, "favorites", id);
          (has ? deleteDoc(ref) : setDoc(ref, { addedAt: serverTimestamp() })).catch(() => {
            // rollback on failure
            setIds((cur) => {
              const rb = new Set(cur);
              if (has) rb.add(id);
              else rb.delete(id);
              return rb;
            });
          });
        } else {
          const arr = [...next];
          writeLocal(arr);
        }
        return next;
      });
    },
    [user],
  );

  const value = useMemo<FavoritesState>(
    () => ({
      favorites: ids,
      isFavorite: (id: string) => ids.has(id),
      toggle,
      count: ids.size,
      ready,
    }),
    [ids, toggle, ready],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
```

- [ ] **Step 2: Mount provider in `src/components/providers.tsx`**

Wrap children INSIDE `AuthProvider` (favorites depend on auth):
```tsx
import { FavoritesProvider } from "@/hooks/useFavorites";
// ...
<AuthProvider>
  <FavoritesProvider>{children}</FavoritesProvider>
</AuthProvider>
```

- [ ] **Step 3: Verify**

Run: `pnpm build` → succeeds.
Run: `pnpm lint` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useFavorites.tsx src/components/providers.tsx
git commit -m "feat: useFavorites hook (localStorage + Firestore, merge on sign-in)"
```

---

## Task 5: `FavoriteButton` + place on `SessionCard`

**Files:**
- Create: `src/components/agenda/FavoriteButton.tsx`
- Modify: `src/components/agenda/SessionCard.tsx`
- Modify: `messages/it.json`, `messages/en.json` (add `myschedule` namespace)

**Interfaces:**
- Consumes: `useFavorites` (`@/hooks/useFavorites`), `useAuth`, lucide `Star`, `cn`.
- Produces: `FavoriteButton` props `{ sessionId: string; className?: string }`.

- [ ] **Step 1: Add `myschedule` keys to BOTH message files**

en:
```json
"myschedule": { "title": "My schedule", "empty": "No saved sessions yet.", "browse": "Browse the agenda", "add": "Save to my schedule", "remove": "Remove from my schedule", "signInNudge": "Sign in to sync your schedule across devices.", "count": "{count} saved" },
```
it:
```json
"myschedule": { "title": "La mia agenda", "empty": "Nessuna sessione salvata.", "browse": "Sfoglia l’agenda", "add": "Salva nella mia agenda", "remove": "Rimuovi dalla mia agenda", "signInNudge": "Accedi per sincronizzare l’agenda su tutti i dispositivi.", "count": "{count} salvate" },
```

- [ ] **Step 2: Implement `src/components/agenda/FavoriteButton.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ sessionId, className }: { sessionId: string; className?: string }) {
  const { isFavorite, toggle, ready } = useFavorites();
  const t = useTranslations("myschedule");
  const active = isFavorite(sessionId);

  return (
    <button
      type="button"
      onClick={() => toggle(sessionId)}
      aria-pressed={active}
      aria-label={active ? t("remove") : t("add")}
      disabled={!ready}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur transition-colors hover:bg-muted disabled:opacity-50",
        className,
      )}
    >
      <Star className={cn("size-4", active ? "fill-gdg-yellow text-gdg-yellow" : "text-muted-foreground")} />
    </button>
  );
}
```

- [ ] **Step 3: Place it on `SessionCard`**

In `src/components/agenda/SessionCard.tsx`, add import:
```tsx
import { FavoriteButton } from "@/components/agenda/FavoriteButton";
```
The root `<article>` already has `relative`. Immediately inside it (before the color spine `<span>`), add — but only for non-service sessions:
```tsx
{!service && (
  <div className="absolute right-3 top-3 z-10">
    <FavoriteButton sessionId={session.id} />
  </div>
)}
```
Also add right padding so the title never collides: on the inner content `<div className="flex min-w-0 flex-1 flex-col gap-2.5 pl-2">` add `pr-10`.

- [ ] **Step 4: Verify**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/it.json','utf8'));console.log('json ok')"` → `json ok`.
Run: `pnpm build` → succeeds.
Run: `pnpm lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/FavoriteButton.tsx src/components/agenda/SessionCard.tsx messages/en.json messages/it.json
git commit -m "feat: FavoriteButton star on SessionCard + myschedule i18n"
```

---

## Task 6: `/my-schedule` page

**Files:**
- Create: `src/app/[locale]/my-schedule/page.tsx`
- Create: `src/components/agenda/MyScheduleList.tsx`

**Interfaces:**
- Consumes: `getSessions`/`getSpeakers`/`getTracks` (`@/lib/data/content`), `useFavorites`, `useAuth`, `SessionCard`, `useTranslations("myschedule")`.
- Produces: the route + a client list component.

- [ ] **Step 1: Server page passes data to a client list — `src/app/[locale]/my-schedule/page.tsx`**

```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getSessions, getSpeakers, getTracks } from "@/lib/data/content";
import { MyScheduleList } from "@/components/agenda/MyScheduleList";

export const metadata: Metadata = { robots: { index: false } };

export default async function MySchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [sessions, speakers, tracks] = await Promise.all([getSessions(), getSpeakers(), getTracks()]);
  return <MyScheduleList sessions={sessions} speakers={speakers} tracks={tracks} />;
}
```

- [ ] **Step 2: Client list — `src/components/agenda/MyScheduleList.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { SessionCard } from "@/components/agenda/SessionCard";
import type { Session, Speaker, Track } from "@/types/models";

export function MyScheduleList({
  sessions,
  speakers,
  tracks,
}: {
  sessions: Session[];
  speakers: Speaker[];
  tracks: Track[];
}) {
  const { favorites, count, ready } = useFavorites();
  const { user, enabled } = useAuth();
  const t = useTranslations("myschedule");

  const mine = sessions
    .filter((s) => favorites.has(s.id))
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">{t("title")}</h1>
      {ready && <p className="mt-2 text-muted-foreground">{t("count", { count })}</p>}

      {enabled && !user && (
        <p className="mt-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
          {t("signInNudge")}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Link href="/agenda" className="mt-3 inline-block font-medium text-gdg-blue hover:underline">
              {t("browse")}
            </Link>
          </div>
        ) : (
          mine.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              speakers={speakers.filter((sp) => s.speakerIds.includes(sp.id))}
              track={tracks.find((tr) => tr.id === s.trackId)}
            />
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm build` → succeeds; `/my-schedule` in the route list (per locale).
Run: `pnpm lint` → clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/my-schedule/page.tsx" src/components/agenda/MyScheduleList.tsx
git commit -m "feat: /my-schedule page lists saved sessions"
```

---

# 2C — Admin

## Task 7: `csv.ts` — CSV serializer (pure, TDD)

**Files:**
- Create: `src/lib/csv.ts`
- Test: `src/lib/csv.test.ts`

**Interfaces:**
- Produces: `toCsv(rows: Record<string, string | number | null | undefined>[], columns: string[]): string`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("emits a header then rows in column order", () => {
    const csv = toCsv([{ a: "1", b: "2" }], ["a", "b"]);
    expect(csv).toBe("a,b\r\n1,2");
  });
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const csv = toCsv([{ a: 'x,y', b: 'he said "hi"', c: "line1\nline2" }], ["a", "b", "c"]);
    expect(csv).toBe('a,b,c\r\n"x,y","he said ""hi""","line1\nline2"');
  });
  it("renders null/undefined as empty", () => {
    expect(toCsv([{ a: null, b: undefined }], ["a", "b"])).toBe("a,b\r\n,");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/csv.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/lib/csv.ts`**

```ts
function cell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(
  rows: Record<string, string | number | null | undefined>[],
  columns: string[],
): string {
  const header = columns.map(cell).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(",")).join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/csv.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat: RFC 4180 CSV serializer"
```

---

## Task 8: `getAdminAuth` + `set-admin` bootstrap script

**Files:**
- Modify: `src/lib/firebase/admin.ts` (add `getAdminAuth`)
- Create: `scripts/set-admin.ts`
- Modify: `package.json` (add `tsx` devDep + `set-admin` script)

**Interfaces:**
- Produces: `getAdminAuth(): Auth | null` (`firebase-admin/auth`); CLI `pnpm set-admin <email>`.
- Note: `set-admin.ts` does NOT import `admin.ts` (which is `server-only`-guarded and would crash a plain `tsx` run). It initializes `firebase-admin` locally from the same `FIREBASE_ADMIN_*` env. `getAdminAuth` is still added to `admin.ts` for Task 9's server-route guard.

- [ ] **Step 1: Add `getAdminAuth` to `src/lib/firebase/admin.ts`**

Add the function. `getAdminDb()` initializes the default firebase-admin app as a side effect; grab it via `getApp()` (the admin Firestore instance does NOT expose `.app`, so don't use `db.app`). `getApp` is ALREADY imported in `admin.ts` (`import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app"`) — only add the `getAuth`/`Auth` import:
```ts
import { getAuth, type Auth } from "firebase-admin/auth";
// ...after getAdminDb()...
export function getAdminAuth(): Auth | null {
  const db = getAdminDb();      // ensures the default app is initialized
  if (!db) return null;
  return getAuth(getApp());
}
```

- [ ] **Step 2: Install `tsx` + add script**

Run: `pnpm add -D tsx`
In `package.json` scripts add: `"set-admin": "tsx scripts/set-admin.ts"`.

- [ ] **Step 3: Create `scripts/set-admin.ts`** (initializes firebase-admin locally — does NOT import `admin.ts`, which is `server-only`)

```ts
/**
 * Grant the Firebase admin custom claim. Usage: pnpm set-admin <email>
 * Requires FIREBASE_ADMIN_* env (service account) in the shell / .env.
 *
 * Initializes firebase-admin directly (not via src/lib/firebase/admin.ts,
 * which is server-only-guarded and would crash under a plain tsx run).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function adminAuth() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getAuth(app);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm set-admin <email>");
    process.exit(1);
  }
  const auth = adminAuth();
  if (!auth) {
    console.error("Admin SDK not configured — set FIREBASE_ADMIN_* env first.");
    process.exit(1);
  }
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ ${email} (uid ${user.uid}) is now an admin. They must re-sign-in for the claim to take effect.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
```

- [ ] **Step 4: Verify**

Run: `pnpm lint` → clean. Run: `pnpm build` → succeeds (admin.ts change compiles).
Run: `pnpm set-admin` (no arg) → prints usage and exits 1 (proves the script runs under tsx). Run with a fake email in seed mode (no env) → "Admin SDK not configured" exit 1. Both are the designed guard paths.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/admin.ts scripts/set-admin.ts package.json pnpm-lock.yaml
git commit -m "feat: getAdminAuth + set-admin bootstrap script"
```

---

## Task 9: `admin-guard.ts` — verify admin ID token (TDD, mocked SDK)

**Files:**
- Create: `src/lib/auth/admin-guard.ts`
- Test: `src/lib/auth/admin-guard.test.ts`

**Interfaces:**
- Consumes: `getAdminAuth` (`@/lib/firebase/admin`).
- Produces: `verifyAdmin(req: Request): Promise<boolean>` (reads `Authorization: Bearer <idToken>`, verifies, checks `admin === true`).

- [ ] **Step 1: Write failing tests** (mock the admin auth boundary)

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}));

import { verifyAdmin } from "@/lib/auth/admin-guard";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/admin/x", { headers });
}

beforeEach(() => verifyIdToken.mockReset());

describe("verifyAdmin", () => {
  it("false when no Authorization header", async () => {
    expect(await verifyAdmin(req())).toBe(false);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
  it("false when token invalid (verify throws)", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad"));
    expect(await verifyAdmin(req({ authorization: "Bearer xxx" }))).toBe(false);
  });
  it("false when valid token lacks admin claim", async () => {
    verifyIdToken.mockResolvedValue({ admin: false, uid: "u1" });
    expect(await verifyAdmin(req({ authorization: "Bearer good" }))).toBe(false);
  });
  it("true when valid token has admin claim", async () => {
    verifyIdToken.mockResolvedValue({ admin: true, uid: "u1" });
    expect(await verifyAdmin(req({ authorization: "Bearer good" }))).toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith("good");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/auth/admin-guard.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/lib/auth/admin-guard.ts`**

```ts
import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";

/** True only for a valid Firebase ID token carrying the `admin` custom claim. */
export async function verifyAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const auth = getAdminAuth();
  if (!auth) return false;
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.admin === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/auth/admin-guard.test.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/admin-guard.ts src/lib/auth/admin-guard.test.ts
git commit -m "feat: verifyAdmin server guard (Bearer ID token + admin claim)"
```

---

## Task 10: `getSiteSettings` — runtime flag read/merge (TDD)

**Files:**
- Create: `src/lib/data/settings.ts`
- Test: `src/lib/data/settings.test.ts`

**Interfaces:**
- Consumes: `getAdminDb` (`@/lib/firebase/admin`), `siteConfig` (`@/lib/site`).
- Produces: `type SiteSettings = { ticketsAvailable: boolean; speakersPublished: boolean; schedulePublished: boolean }`; `getSiteSettings(): Promise<SiteSettings>`; `mergeSettings(doc: Record<string, unknown> | null): SiteSettings` (exported for test).

- [ ] **Step 1: Write failing tests** (test the pure merge)

```ts
import { describe, expect, it } from "vitest";
import { mergeSettings } from "@/lib/data/settings";
import { siteConfig } from "@/lib/site";

describe("mergeSettings", () => {
  it("falls back to siteConfig constants when doc is null", () => {
    expect(mergeSettings(null)).toEqual({
      ticketsAvailable: siteConfig.ticketsAvailable,
      speakersPublished: siteConfig.speakersPublished,
      schedulePublished: siteConfig.schedulePublished,
    });
  });
  it("overrides per-flag only when the doc has a boolean", () => {
    const m = mergeSettings({ ticketsAvailable: true, speakersPublished: "yes" });
    expect(m.ticketsAvailable).toBe(true);          // boolean override applied
    expect(m.speakersPublished).toBe(siteConfig.speakersPublished); // non-boolean ignored
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/data/settings.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/lib/data/settings.ts`**

```ts
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { siteConfig } from "@/lib/site";

export type SiteSettings = {
  ticketsAvailable: boolean;
  speakersPublished: boolean;
  schedulePublished: boolean;
};

const FLAGS = ["ticketsAvailable", "speakersPublished", "schedulePublished"] as const;

export function mergeSettings(doc: Record<string, unknown> | null): SiteSettings {
  const out = {} as SiteSettings;
  for (const k of FLAGS) {
    out[k] = typeof doc?.[k] === "boolean" ? (doc[k] as boolean) : siteConfig[k];
  }
  return out;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = getAdminDb();
  if (!db) return mergeSettings(null);
  try {
    const snap = await db.collection("config").doc("site").get();
    return mergeSettings(snap.exists ? (snap.data() as Record<string, unknown>) : null);
  } catch {
    return mergeSettings(null);
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/data/settings.test.ts` → pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/settings.ts src/lib/data/settings.test.ts
git commit -m "feat: getSiteSettings runtime flag merge (Firestore config/site over constants)"
```

---

## Task 11: Wire runtime settings into the 6 flag readers

**Files:**
- Create: `src/components/providers/SiteSettingsProvider.tsx`
- Modify: `src/app/[locale]/layout.tsx` (await settings, wrap provider)
- Modify: `src/components/sections/Hero.tsx` (client read via context)
- Modify: `src/components/common/TicketButton.tsx` (client read via context)
- Modify: `src/app/[locale]/page.tsx`, `src/app/[locale]/speakers/page.tsx` (server read)
- Modify: `src/lib/data/content.ts` (`isSchedulePublished` server read)

**Interfaces:**
- Consumes: `getSiteSettings`/`SiteSettings` (`@/lib/data/settings`).
- Produces: `SiteSettingsProvider` + `useSiteSettings(): SiteSettings`.

- [ ] **Step 1: Create the client provider — `src/components/providers/SiteSettingsProvider.tsx`**

```tsx
"use client";

import { createContext, useContext } from "react";
import { siteConfig } from "@/lib/site";
import type { SiteSettings } from "@/lib/data/settings";

const fallback: SiteSettings = {
  ticketsAvailable: siteConfig.ticketsAvailable,
  speakersPublished: siteConfig.speakersPublished,
  schedulePublished: siteConfig.schedulePublished,
};

const SiteSettingsContext = createContext<SiteSettings>(fallback);

export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
```

- [ ] **Step 2: Populate it in the server layout — `src/app/[locale]/layout.tsx`**

Add import + await inside `LocaleLayout` (it's an async server component):
```tsx
import { getSiteSettings } from "@/lib/data/settings";
import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
```
After `setRequestLocale(locale);` add: `const settings = await getSiteSettings();`
Wrap the existing tree: change `<Providers>...</Providers>` to
```tsx
<Providers>
  <SiteSettingsProvider value={settings}>
    <SkipLink />
    <RegisterSW />
    <Header />
    <main id="main">{children}</main>
    <Footer />
  </SiteSettingsProvider>
</Providers>
```
(Keep whatever children currently sit inside `<Providers>` — just nest them within `SiteSettingsProvider`.)

- [ ] **Step 3: Switch client readers to the context**

`src/components/sections/Hero.tsx`: add `import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";`, then near the top of the component `const { ticketsAvailable } = useSiteSettings();` and replace `siteConfig.ticketsAvailable` (line ~127) with `ticketsAvailable`.

`src/components/common/TicketButton.tsx`: this is a client component used only in client trees (Hero, Header). Add `"use client";` at the very top if not present, add `import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";`, `const { ticketsAvailable } = useSiteSettings();`, and replace both `siteConfig.ticketsAvailable` reads with `ticketsAvailable`. (Keep `siteConfig.ticketsUrl` as-is.)

- [ ] **Step 4: Switch server readers to `getSiteSettings()`**

`src/app/[locale]/page.tsx`: add `import { getSiteSettings } from "@/lib/data/settings";`. After `setRequestLocale`, add `const { speakersPublished } = await getSiteSettings();`. Replace both `siteConfig.speakersPublished` reads with `speakersPublished`.

`src/app/[locale]/speakers/page.tsx`: add the import; replace `const published = siteConfig.speakersPublished;` with `const { speakersPublished: published } = await getSiteSettings();`.

`src/lib/data/content.ts` `isSchedulePublished`: add `import { getSiteSettings } from "./settings";`; replace `if (!siteConfig.schedulePublished) return false;` with `const { schedulePublished } = await getSiteSettings(); if (!schedulePublished) return false;`.

- [ ] **Step 5: Verify (both build modes — this touches the flag path)**

Run: `pnpm test` → all suites still pass (settings merge unaffected).
Run: `pnpm build` → succeeds.
Run: `pnpm build:static` → succeeds (no Firebase → `getSiteSettings` returns constants → behavior identical to today).
Run: `pnpm lint` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/SiteSettingsProvider.tsx "src/app/[locale]/layout.tsx" src/components/sections/Hero.tsx src/components/common/TicketButton.tsx "src/app/[locale]/page.tsx" "src/app/[locale]/speakers/page.tsx" src/lib/data/content.ts
git commit -m "feat: runtime site settings — flags read from Firestore config/site"
```

---

## Task 12: Admin shell — `adminFetch` helper, layout guard (IT)

**Files:**
- Create: `src/lib/admin-client.ts` (client fetch helper that attaches the ID token)
- Create: `src/app/[locale]/admin/layout.tsx`
- Create: `src/components/admin/AdminGate.tsx`

**Interfaces:**
- Consumes: `useAuth`, `getFirebaseAuth` (`@/lib/firebase/client`).
- Produces: `adminFetch(path: string, init?: RequestInit): Promise<Response>`; `AdminGate` (client) wrapping admin pages; admin layout.

- [ ] **Step 1: `src/lib/admin-client.ts` — attach Bearer token**

```ts
import { getFirebaseAuth } from "@/lib/firebase/client";

/** fetch() against /api/admin/* with the current user's ID token attached. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
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

- [ ] **Step 2: `src/components/admin/AdminGate.tsx` — client claim check (IT copy)**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading, enabled, signIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(null);
      return;
    }
    user.getIdTokenResult().then((r) => {
      if (active) setIsAdmin(r.claims.admin === true);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!enabled) return <Shell>Backend non configurato.</Shell>;
  if (loading) return <Shell>Caricamento…</Shell>;
  if (!user)
    return (
      <Shell>
        <p className="mb-4">Accedi con un account amministratore.</p>
        <Button onClick={() => void signIn()}>Accedi</Button>
      </Shell>
    );
  if (isAdmin === null) return <Shell>Verifica permessi…</Shell>;
  if (!isAdmin) return <Shell>Accesso negato. Questo account non è amministratore.</Shell>;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="mb-4 font-display text-2xl font-bold">Admin</h1>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/[locale]/admin/layout.tsx` — wrap with gate + nav (IT)**

```tsx
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { AdminGate } from "@/components/admin/AdminGate";

export const metadata: Metadata = { robots: { index: false }, title: "Admin · DevFest Milano 2026" };

const SECTIONS = [
  { href: "/admin/sponsors", label: "Sponsor" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/subscribers", label: "Iscritti" },
  { href: "/admin/config", label: "Configurazione" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full px-3.5 py-1.5 text-sm font-medium hover:bg-muted">
              {s.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </AdminGate>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm build` → succeeds (admin routes appear). Run: `pnpm lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-client.ts src/components/admin/AdminGate.tsx "src/app/[locale]/admin/layout.tsx"
git commit -m "feat: admin shell — adminFetch, claim gate, IT nav"
```

---

## Task 13: Sponsors admin — API route + UI

**Files:**
- Create: `src/app/api/admin/sponsors/route.ts`
- Create: `src/app/[locale]/admin/sponsors/page.tsx`
- Create: `src/components/admin/SponsorsAdmin.tsx`

**Interfaces:**
- Consumes: `verifyAdmin` (`@/lib/auth/admin-guard`), `getAdminDb`, `getSponsors` (`@/lib/data/content`), `adminFetch`, `Sponsor`/`SPONSOR_TIERS` (`@/types/models`), `revalidatePath`.
- Produces: `POST` (upsert) + `DELETE` on `/api/admin/sponsors`.

- [ ] **Step 1: API route — `src/app/api/admin/sponsors/route.ts`**

```ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

function revalidateSponsors() {
  for (const l of ["it", "en"]) {
    revalidatePath(`/${l}`);
    revalidatePath(`/${l}/sponsors`);
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.tier !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("sponsors").doc().id;
  const data = {
    name: body.name,
    tier: body.tier,
    website: typeof body.website === "string" ? body.website : "",
    logoLight: body.logoLight ?? null,
    logoDark: body.logoDark ?? null,
    order: Number.isFinite(body.order) ? Number(body.order) : 999,
    active: body.active !== false,
  };
  await db.collection("sponsors").doc(id).set(data, { merge: true });
  revalidateSponsors();
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("sponsors").doc(id).delete();
  revalidateSponsors();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Server page loads current sponsors — `src/app/[locale]/admin/sponsors/page.tsx`**

```tsx
import { getSponsors } from "@/lib/data/content";
import { SponsorsAdmin } from "@/components/admin/SponsorsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage() {
  const sponsors = await getSponsors();
  return <SponsorsAdmin initial={sponsors} />;
}
```
Note: `getSponsors()` filters `active` — for admin we want ALL. Add a sibling reader in `content.ts`: `getAllSponsors()` that skips the active filter, and use it here. Add to `content.ts`:
```ts
export async function getAllSponsors(): Promise<Sponsor[]> {
  const list = await read<Sponsor>("sponsors", seedSponsors);
  return [...list].sort(byOrder);
}
```
and import `getAllSponsors` in the page instead of `getSponsors`.

- [ ] **Step 3: Client CRUD UI — `src/components/admin/SponsorsAdmin.tsx`** (IT inline)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { SPONSOR_TIERS, type Sponsor } from "@/types/models";

const EMPTY: Partial<Sponsor> = { name: "", tier: "gold", website: "", logoLight: "", logoDark: "", order: 999, active: true };

export function SponsorsAdmin({ initial }: { initial: Sponsor[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Sponsor>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await adminFetch("/api/admin/sponsors", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) {
      setForm(EMPTY);
      router.refresh();
    } else {
      setError(`Errore (${res.status}).`);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo sponsor?")) return;
    const res = await adminFetch(`/api/admin/sponsors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Sponsor</h2>

      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="py-2">Nome</th><th>Tier</th><th>Ordine</th><th>Attivo</th><th></th></tr>
        </thead>
        <tbody>
          {initial.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="py-2">{s.name}</td>
              <td>{s.tier}</td>
              <td>{s.order}</td>
              <td>{s.active ? "sì" : "no"}</td>
              <td className="text-right">
                <button onClick={() => setForm(s)} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(s.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica sponsor" : "Nuovo sponsor"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" value={form.name ?? ""} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="text-sm">Tier
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as Sponsor["tier"] })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2">
              {SPONSOR_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Field label="Sito web" value={form.website ?? ""} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="Ordine" value={String(form.order ?? 999)} onChange={(v) => setForm({ ...form, order: Number(v) || 999 })} />
          <Field label="Logo (light) URL" value={form.logoLight ?? ""} onChange={(v) => setForm({ ...form, logoLight: v })} />
          <Field label="Logo (dark) URL" value={form.logoDark ?? ""} onChange={(v) => setForm({ ...form, logoDark: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Attivo
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-gdg-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy || !form.name}>{form.id ? "Salva" : "Aggiungi"}</Button>
          {form.id && <Button variant="ghost" onClick={() => setForm(EMPTY)}>Annulla</Button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">{label}
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
    </label>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm build` → succeeds (`/api/admin/sponsors` + `/admin/sponsors` in routes). Run: `pnpm lint` → clean.
Run: `pnpm build:static` → succeeds (api stripped; admin page renders the gate).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/sponsors/route.ts "src/app/[locale]/admin/sponsors/page.tsx" src/components/admin/SponsorsAdmin.tsx src/lib/data/content.ts
git commit -m "feat: admin sponsors CRUD (route + UI + getAllSponsors)"
```

---

## Task 14: Team admin — API route + UI

**Files:**
- Create: `src/app/api/admin/team/route.ts`
- Create: `src/app/[locale]/admin/team/page.tsx`
- Create: `src/components/admin/TeamAdmin.tsx`
- Modify: `src/lib/data/content.ts` (no change needed — `getTeam` returns all)

**Interfaces:**
- Consumes: `verifyAdmin`, `getAdminDb`, `getTeam` (`@/lib/data/content`), `adminFetch`, `TeamMember` (`@/types/models`), `revalidatePath`.
- Produces: `POST`/`DELETE` on `/api/admin/team`.

- [ ] **Step 1: API route — `src/app/api/admin/team/route.ts`**

```ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

function revalidateTeam() {
  for (const l of ["it", "en"]) revalidatePath(`/${l}/team`);
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const id = typeof body.id === "string" && body.id ? body.id : db.collection("team").doc().id;
  const data = {
    name: body.name,
    role: { it: body.roleIt ?? "", en: body.roleEn ?? "" },
    photo: body.photo ?? null,
    links: Array.isArray(body.links) ? body.links : [],
    order: Number.isFinite(body.order) ? Number(body.order) : 999,
  };
  await db.collection("team").doc(id).set(data, { merge: true });
  revalidateTeam();
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  await db.collection("team").doc(id).delete();
  revalidateTeam();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Server page — `src/app/[locale]/admin/team/page.tsx`**

```tsx
import { getTeam } from "@/lib/data/content";
import { TeamAdmin } from "@/components/admin/TeamAdmin";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const team = await getTeam();
  return <TeamAdmin initial={team} />;
}
```

- [ ] **Step 3: Client UI — `src/components/admin/TeamAdmin.tsx`** (IT inline)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/types/models";

type Draft = { id?: string; name: string; roleIt: string; roleEn: string; photo: string; order: number };
const EMPTY: Draft = { name: "", roleIt: "", roleEn: "", photo: "", order: 999 };

function toDraft(m: TeamMember): Draft {
  return { id: m.id, name: m.name, roleIt: m.role.it, roleEn: m.role.en, photo: m.photo ?? "", order: m.order };
}

export function TeamAdmin({ initial }: { initial: TeamMember[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await adminFetch("/api/admin/team", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) {
      setForm(EMPTY);
      router.refresh();
    } else setError(`Errore (${res.status}).`);
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo membro?")) return;
    const res = await adminFetch(`/api/admin/team?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Team</h2>
      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="py-2">Nome</th><th>Ruolo (IT)</th><th>Ordine</th><th></th></tr></thead>
        <tbody>
          {initial.map((m) => (
            <tr key={m.id} className="border-t border-border">
              <td className="py-2">{m.name}</td><td>{m.role.it}</td><td>{m.order}</td>
              <td className="text-right">
                <button onClick={() => setForm(toDraft(m))} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(m.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica membro" : "Nuovo membro"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome" v={form.name} on={(v) => setForm({ ...form, name: v })} />
          <F label="Ruolo (IT)" v={form.roleIt} on={(v) => setForm({ ...form, roleIt: v })} />
          <F label="Ruolo (EN)" v={form.roleEn} on={(v) => setForm({ ...form, roleEn: v })} />
          <F label="Foto URL" v={form.photo} on={(v) => setForm({ ...form, photo: v })} />
          <F label="Ordine" v={String(form.order)} on={(v) => setForm({ ...form, order: Number(v) || 999 })} />
        </div>
        {error && <p className="mt-3 text-sm text-gdg-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy || !form.name}>{form.id ? "Salva" : "Aggiungi"}</Button>
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

- [ ] **Step 4: Verify**

Run: `pnpm build` → succeeds. Run: `pnpm lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/team/route.ts "src/app/[locale]/admin/team/page.tsx" src/components/admin/TeamAdmin.tsx
git commit -m "feat: admin team CRUD (route + UI)"
```

---

## Task 15: Subscribers admin — list + CSV export

**Files:**
- Create: `src/app/api/admin/subscribers/route.ts` (GET list — JSON)
- Create: `src/app/api/admin/subscribers/export/route.ts` (GET CSV)
- Create: `src/app/[locale]/admin/subscribers/page.tsx`
- Create: `src/components/admin/SubscribersAdmin.tsx`

**Interfaces:**
- Consumes: `verifyAdmin`, `getAdminDb`, `toCsv` (`@/lib/csv`), `adminFetch`.
- Produces: `GET /api/admin/subscribers` → `{ ok, rows }`; `GET /api/admin/subscribers/export` → `text/csv`.

- [ ] **Step 1: List route — `src/app/api/admin/subscribers/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

type Row = { email: string; createdAt: string; locale: string; source: string };

async function rows(): Promise<Row[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("subscribers").get();
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const ts = x.createdAt as { toDate?: () => Date } | undefined;
    return {
      email: typeof x.email === "string" ? x.email : d.id,
      createdAt: ts?.toDate ? ts.toDate().toISOString() : "",
      locale: typeof x.locale === "string" ? x.locale : "",
      source: typeof x.source === "string" ? x.source : "",
    };
  });
}

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, rows: await rows() });
}

export { rows };
```

- [ ] **Step 2: Export route — `src/app/api/admin/subscribers/export/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const snap = await db.collection("subscribers").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const ts = x.createdAt as { toDate?: () => Date } | undefined;
    return {
      email: typeof x.email === "string" ? x.email : d.id,
      createdAt: ts?.toDate ? ts.toDate().toISOString() : "",
      locale: typeof x.locale === "string" ? x.locale : "",
      source: typeof x.source === "string" ? x.source : "",
    };
  });
  const csv = toCsv(rows, ["email", "createdAt", "locale", "source"]);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="subscribers.csv"',
    },
  });
}
```

- [ ] **Step 3: Page + client component**

`src/app/[locale]/admin/subscribers/page.tsx`:
```tsx
import { SubscribersAdmin } from "@/components/admin/SubscribersAdmin";
export const dynamic = "force-dynamic";
export default function AdminSubscribersPage() {
  return <SubscribersAdmin />;
}
```
`src/components/admin/SubscribersAdmin.tsx` (IT inline, fetches via `adminFetch`):
```tsx
"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";

type Row = { email: string; createdAt: string; locale: string; source: string };

export function SubscribersAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/subscribers")
      .then(async (r) => (r.ok ? ((await r.json()).rows as Row[]) : Promise.reject(r.status)))
      .then(setRows)
      .catch((s) => setError(`Errore (${s}).`));
  }, []);

  async function exportCsv() {
    const res = await adminFetch("/api/admin/subscribers/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Iscritti</h2>
        <Button onClick={exportCsv} disabled={!rows?.length}>Esporta CSV</Button>
      </div>
      {error && <p className="text-sm text-gdg-red">{error}</p>}
      {!rows && !error && <p className="text-muted-foreground">Caricamento…</p>}
      {rows && (
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="py-2">Email</th><th>Data</th><th>Lingua</th><th>Origine</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t border-border">
                <td className="py-2">{r.email}</td><td>{r.createdAt}</td><td>{r.locale}</td><td>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows && rows.length === 0 && <p className="mt-4 text-muted-foreground">Nessun iscritto.</p>}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm build` → succeeds (both subscriber routes + page). Run: `pnpm lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/admin/subscribers/route.ts" "src/app/api/admin/subscribers/export/route.ts" "src/app/[locale]/admin/subscribers/page.tsx" src/components/admin/SubscribersAdmin.tsx
git commit -m "feat: admin subscribers list + CSV export"
```

---

## Task 16: Config toggles admin — API route + UI

**Files:**
- Create: `src/app/api/admin/config/route.ts`
- Create: `src/app/[locale]/admin/config/page.tsx`
- Create: `src/components/admin/ConfigAdmin.tsx`

**Interfaces:**
- Consumes: `verifyAdmin`, `getAdminDb`, `getSiteSettings`/`SiteSettings` (`@/lib/data/settings`), `adminFetch`, `revalidatePath`.
- Produces: `POST /api/admin/config` (writes booleans to `config/site`).

- [ ] **Step 1: API route — `src/app/api/admin/config/route.ts`**

```ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

const FLAGS = ["ticketsAvailable", "speakersPublished", "schedulePublished"] as const;

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const update: Record<string, boolean> = {};
  for (const f of FLAGS) if (typeof body[f] === "boolean") update[f] = body[f];
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: false, reason: "no-flags" }, { status: 400 });
  await db.collection("config").doc("site").set(update, { merge: true });
  // Affected public routes across both locales.
  for (const l of ["it", "en"]) {
    revalidatePath(`/${l}`);
    revalidatePath(`/${l}/speakers`);
    revalidatePath(`/${l}/agenda`);
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Page (reads current settings server-side) — `src/app/[locale]/admin/config/page.tsx`**

```tsx
import { getSiteSettings } from "@/lib/data/settings";
import { ConfigAdmin } from "@/components/admin/ConfigAdmin";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const settings = await getSiteSettings();
  return <ConfigAdmin initial={settings} />;
}
```

- [ ] **Step 3: Client UI — `src/components/admin/ConfigAdmin.tsx`** (IT inline)

```tsx
"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import type { SiteSettings } from "@/lib/data/settings";

const LABELS: Record<keyof SiteSettings, string> = {
  ticketsAvailable: "Biglietti in vendita",
  speakersPublished: "Speaker pubblicati",
  schedulePublished: "Agenda pubblicata",
};

export function ConfigAdmin({ initial }: { initial: SiteSettings }) {
  const [flags, setFlags] = useState<SiteSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await adminFetch("/api/admin/config", { method: "POST", body: JSON.stringify(flags) });
    setBusy(false);
    setMsg(res.ok ? "Salvato. Le pagine pubbliche sono state rigenerate." : `Errore (${res.status}).`);
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 font-display text-xl font-bold">Configurazione</h2>
      <div className="flex flex-col gap-3">
        {(Object.keys(LABELS) as (keyof SiteSettings)[]).map((k) => (
          <label key={k} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <span>{LABELS[k]}</span>
            <input type="checkbox" checked={flags[k]} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} />
          </label>
        ))}
      </div>
      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
      <Button className="mt-4" onClick={save} disabled={busy}>Salva</Button>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm build` → succeeds. Run: `pnpm build:static` → succeeds (api stripped, page renders gate). Run: `pnpm lint` → clean. Run: `pnpm test` → all suites pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/admin/config/route.ts" "src/app/[locale]/admin/config/page.tsx" src/components/admin/ConfigAdmin.tsx
git commit -m "feat: admin config toggles (write Firestore config/site + revalidate)"
```

---

## Task 17: Docs — README admin section + STATUS update

**Files:**
- Modify: `README.md` (add an "Admin" subsection)
- Modify: `docs/STATUS.md`

- [ ] **Step 1: README admin note**

Add a short "Admin" section: grant access with `pnpm set-admin <email>` (needs `FIREBASE_ADMIN_*` env), sign in at `/admin` with that Google account (re-sign-in after the claim is set), sections = sponsors/team/subscribers/config, images are pasted URLs, config toggles write `config/site` and revalidate public pages.

- [ ] **Step 2: STATUS update**

Add a `### ✅ Batch 2` block under Done: login UI (AuthButton), My Schedule favorites (localStorage + Firestore, merge on sign-in, `/my-schedule`), admin (`/admin`, claim-gated via `set-admin`, sponsors/team CRUD + subscribers CSV + runtime config toggles via `getSiteSettings`). In Pending, remove "Google Sign-In UI + My Schedule favorites" and "lightweight admin (sponsors/news CRUD)"; note news CRUD remains the only unbuilt admin area, and full offline content caching + Phase 3 remain.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/STATUS.md
git commit -m "docs: Batch 2 admin usage + STATUS update"
```

---

## Verification checklist (before declaring Batch 2 complete)

- [ ] `pnpm test` — favorites, csv, settings-merge, admin-guard suites all green (plus Batch 1's calendar/email).
- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — succeeds; routes include `/my-schedule`, `/admin/*`, `/api/admin/*`.
- [ ] `pnpm build:static` — succeeds; `/api/admin/*` absent, admin pages render the gate, favorites work via localStorage, public flag behavior unchanged (constants).
- [ ] Manual (go-live, needs a live Firebase project): Google sign-in → avatar menu; star a session signed-out (localStorage) then sign in → it merges into Firestore; `pnpm set-admin <email>` → re-sign-in → `/admin` reachable, non-admins blocked; edit a sponsor/team member → reflects after refresh; toggle a config flag → public UI changes; CSV downloads.
- [ ] Both locales render all new public copy (`auth`, `myschedule`).
