# Batch 1 (Add-to-Calendar · PWA · Notify-me) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three now-safe features — add-to-calendar (event + per-session), an installable offline-capable PWA, and a notify-me email-capture that persists to Firestore.

**Architecture:** Pure builder modules (`calendar.ts`, `email.ts`) carry all logic and are unit-tested with Vitest. Thin UI/route layers consume them. PWA is vanilla web APIs (manifest metadata route + `public/sw.js` + a client registrar). Notify-me adds a thin server route writing via the existing Admin SDK, with graceful degrade when the backend is unconfigured or on static export.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, next-intl, Firebase Admin SDK, Radix dropdown/dialog, lucide-react, **Vitest** (new dev dep).

## Global Constraints

- Next.js 16 App Router — `params` is a Promise; read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- i18n: next-intl, locales `["it","en"]`, defaultLocale `it`, prefix always. Messages at repo-root `messages/it.json` + `messages/en.json` — **add every new key to BOTH**.
- Path alias: `@/*` → `./src/*`.
- Two build modes: normal server build (Vercel) and `STATIC_EXPORT=1` (GitHub Pages, `output: "export"`). Server routes (`/api/*`) do not exist on static export — features must degrade, not break.
- `proxy.ts` matcher excludes `/api`, `_next`, `_vercel`, and any dotted path → `/manifest.webmanifest`, `/sw.js` pass through un-rewritten.
- Firebase may be unconfigured (seed mode): `getAdminDb()` returns `null`, `isAdminConfigured` is false. Handle null.
- Timezone for all session times: `Europe/Rome`. `Session.startsAt`/`endsAt` are `string | null`.
- Existing helpers: `cn` (`@/lib/utils`), `Button` + `buttonVariants` (`@/components/ui/button`, sizes `sm|md|lg|icon`, variants `primary|accent|outline|ghost|link`), `localized` (`@/lib/localize`), `formatTimeRange` (`@/lib/time`), `Link` (`@/i18n/navigation`), GDG tokens (`@/lib/design/tokens`: `GDG`, `GDG_ORDER`, `colorClasses`).
- Commit after every task. Branch `batch1-calendar-pwa-notify` (already checked out). No push.

---

## Task 0: Vitest test harness

**Files:**
- Modify: `package.json` (add devDeps + `test` script)
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: a `pnpm test` runner resolving the `@/*` alias, so all later tasks' `*.test.ts` run.

- [ ] **Step 1: Install Vitest**

Run: `pnpm add -D vitest@^3 @vitejs/plugin-react vite-tsconfig-paths`
Expected: added to devDependencies, no errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Add `test` script to `package.json`**

In `"scripts"` add: `"test": "vitest run"` and `"test:watch": "vitest"`.

- [ ] **Step 4: Smoke test the runner**

Create `src/lib/__smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```
Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 5: Delete the smoke test, commit**

```bash
rm src/lib/__smoke.test.ts
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test: add Vitest harness with @/ path alias"
```

---

## Task 1: `calendar.ts` — ICS + Google Calendar builders (pure, TDD)

**Files:**
- Create: `src/lib/calendar.ts`
- Test: `src/lib/calendar.test.ts`

**Interfaces:**
- Produces:
  - `interface CalendarEvent { title: string; description?: string; location?: string; start: string; end: string; url?: string; uid?: string }`
  - `googleCalendarUrl(e: CalendarEvent): string`
  - `buildIcs(e: CalendarEvent): string`
  - `icsDataUri(e: CalendarEvent): string`
  - `toCalUtc(iso: string): string` (helper, exported for test) — converts an ISO-with-offset to `YYYYMMDDTHHMMSSZ` (UTC).

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl, icsDataUri, toCalUtc, type CalendarEvent } from "@/lib/calendar";

const ev: CalendarEvent = {
  title: "DevFest Milano 2026",
  description: "A day of talks; demos, and code.",
  location: "Randstad Box, Via San Vigilio 5, Milano",
  start: "2026-10-10T09:00:00+02:00",
  end: "2026-10-10T19:00:00+02:00",
  url: "https://2026.devfestmilano.it",
  uid: "devfest-2026",
};

describe("toCalUtc", () => {
  it("converts +02:00 offset to UTC basic format", () => {
    expect(toCalUtc("2026-10-10T09:00:00+02:00")).toBe("20261010T070000Z");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a TEMPLATE url with UTC dates and encoded fields", () => {
    const u = googleCalendarUrl(ev);
    expect(u).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
    expect(u).toContain("dates=20261010T070000Z%2F20261010T170000Z");
    expect(u).toContain("text=DevFest+Milano+2026");
    expect(u).toContain("location=Randstad+Box");
  });
});

describe("buildIcs", () => {
  it("emits a valid VEVENT with CRLF and escaped fields", () => {
    const ics = buildIcs(ev);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("UID:devfest-2026");
    expect(ics).toContain("DTSTART:20261010T070000Z");
    expect(ics).toContain("DTEND:20261010T170000Z");
    expect(ics).toContain("SUMMARY:DevFest Milano 2026");
    // comma and semicolon escaped per RFC 5545
    expect(ics).toContain("DESCRIPTION:A day of talks\\; demos\\, and code.");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toMatch(/\r\n/);
  });
  it("derives a uid when none given", () => {
    const { uid, ...noUid } = ev;
    expect(buildIcs(noUid)).toMatch(/UID:.+/);
  });
});

describe("icsDataUri", () => {
  it("returns a text/calendar data uri", () => {
    expect(icsDataUri(ev)).toMatch(/^data:text\/calendar;charset=utf-8,/);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/calendar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/calendar.ts`**

```ts
export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  /** ISO 8601 with offset. */
  start: string;
  end: string;
  url?: string;
  uid?: string;
}

/** ISO-with-offset → UTC basic `YYYYMMDDTHHMMSSZ`. */
export function toCalUtc(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function slugUid(e: CalendarEvent): string {
  const base = `${e.title}-${e.start}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}@devfestmilano.it`;
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${toCalUtc(e.start)}/${toCalUtc(e.end)}`,
  });
  if (e.description) params.set("details", e.url ? `${e.description}\n${e.url}` : e.description);
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(e: CalendarEvent): string {
  const uid = e.uid ?? slugUid(e);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DevFest Milano//2026//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toCalUtc(e.start)}`,
    `DTSTART:${toCalUtc(e.start)}`,
    `DTEND:${toCalUtc(e.end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function icsDataUri(e: CalendarEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(e))}`;
}
```

Note: `URLSearchParams` encodes spaces as `+` — matches the test expectations (`text=DevFest+Milano+2026`).

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/calendar.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar.ts src/lib/calendar.test.ts
git commit -m "feat: add ICS + Google Calendar builders"
```

---

## Task 2: `AddToCalendar` component

**Files:**
- Create: `src/components/common/AddToCalendar.tsx`
- Modify: `messages/it.json`, `messages/en.json` (add `calendar` namespace)

**Interfaces:**
- Consumes: `calendar.ts` (`googleCalendarUrl`, `icsDataUri`, `CalendarEvent`), `buttonVariants`/`cn`, Radix dropdown (`@radix-ui/react-dropdown-menu`), lucide `CalendarPlus`.
- Produces: `<AddToCalendar event={...} size? variant? filename? />` default export-less named export `AddToCalendar`.

- [ ] **Step 1: Add i18n keys to BOTH message files**

`messages/en.json` add top-level:
```json
"calendar": { "add": "Add to calendar", "google": "Google Calendar", "ics": "Download .ics" },
```
`messages/it.json` add top-level:
```json
"calendar": { "add": "Aggiungi al calendario", "google": "Google Calendar", "ics": "Scarica .ics" },
```

- [ ] **Step 2: Implement the component**

```tsx
"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { CalendarPlus, Download, ArrowUpRight } from "lucide-react";
import { googleCalendarUrl, icsDataUri, type CalendarEvent } from "@/lib/calendar";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToCalendar({
  event,
  size = "md",
  variant = "outline",
  filename = "devfest-milano-2026.ics",
  className,
}: {
  event: CalendarEvent;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  filename?: string;
  className?: string;
}) {
  const t = useTranslations("calendar");
  if (!event.start || !event.end) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={cn(buttonVariants({ variant, size }), className)}>
        <CalendarPlus className="size-4" />
        {t("add")}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] data-[state=open]:motion-safe:animate-[acc-down_0.18s_ease]"
        >
          <DropdownMenu.Item asChild>
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              {t("google")}
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href={icsDataUri(event)}
              download={filename}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              {t("ics")}
              <Download className="size-4 text-muted-foreground" />
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

- [ ] **Step 3: Verify build + lint**

Run: `pnpm lint`
Expected: no errors for the new file.

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/it.json','utf8')); console.log('json ok')"`
Expected: `json ok`.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/AddToCalendar.tsx messages/en.json messages/it.json
git commit -m "feat: add AddToCalendar dropdown (Google + ics)"
```

---

## Task 3: Wire event-level calendar onto the site

**Files:**
- Create: `src/lib/event-calendar.ts` (builds the whole-event `CalendarEvent` from `siteConfig`)
- Modify: `src/components/sections/Hero.tsx` (render `AddToCalendar` in the CTA cluster)
- Modify: `messages/it.json`, `messages/en.json` (add `calendar.eventDescription`)

**Interfaces:**
- Consumes: `siteConfig`, `CalendarEvent`.
- Produces: `eventCalendarEvent(description: string): CalendarEvent`.

- [ ] **Step 1: Read Hero to find the CTA cluster**

Run: `pnpm exec grep -n "ctaNotify\|NotifyTicketsDialog\|TicketButton\|cfp" src/components/sections/Hero.tsx`
Note the JSX block where the CTA buttons render (~line 124).

- [ ] **Step 2: Create `src/lib/event-calendar.ts`**

```ts
import { siteConfig } from "@/lib/site";
import type { CalendarEvent } from "@/lib/calendar";

export function eventCalendarEvent(description: string): CalendarEvent {
  return {
    title: siteConfig.name,
    description,
    location: `${siteConfig.venue.name}, ${siteConfig.venue.address}`,
    start: siteConfig.eventDate,
    end: siteConfig.eventEnd,
    url: siteConfig.url,
    uid: "devfest-milano-2026@devfestmilano.it",
  };
}
```

- [ ] **Step 3: Add `calendar.eventDescription` to BOTH message files**

en: `"eventDescription": "DevFest Milano 2026 — a full day of talks and community at Randstad Box."`
it: `"eventDescription": "DevFest Milano 2026 — una giornata di talk e community al Randstad Box."`
(Add inside the existing `calendar` object from Task 2.)

- [ ] **Step 4: Render `AddToCalendar` in Hero**

In `Hero.tsx`, import at top:
```tsx
import { AddToCalendar } from "@/components/common/AddToCalendar";
import { eventCalendarEvent } from "@/lib/event-calendar";
```
Hero is a client component (`"use client"`, already uses `useTranslations("hero")`). Add a second translator near it: `const tCal = useTranslations("calendar");`. Then in the CTA cluster, after the existing buttons, add:
```tsx
<AddToCalendar event={eventCalendarEvent(tCal("eventDescription"))} variant="ghost" size="md" />
```

- [ ] **Step 5: Verify dev render**

Run: `PORT=3100 pnpm dev` (background), then `curl -s localhost:3100/it | grep -qi "calendar" && echo "rendered"` — or open the browser and confirm the "Aggiungi al calendario" button appears on the hero, opening Google Calendar / downloading an ics. Stop dev server.

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/event-calendar.ts src/components/sections/Hero.tsx messages/en.json messages/it.json
git commit -m "feat: add event-level add-to-calendar to hero"
```

---

## Task 4: Wire per-session calendar into SessionCard

**Files:**
- Modify: `src/components/agenda/SessionCard.tsx`

**Interfaces:**
- Consumes: `AddToCalendar`, `CalendarEvent`, `localized`, existing `session`/`locale`.

- [ ] **Step 1: Add calendar button when the session has times**

In `SessionCard.tsx`, add imports:
```tsx
import { AddToCalendar } from "@/components/common/AddToCalendar";
import { siteConfig } from "@/lib/site";
```
After the speakers block (around line 91), before the tags block, add:
```tsx
{!service && session.startsAt && session.endsAt && (
  <div className="mt-2">
    <AddToCalendar
      size="sm"
      variant="ghost"
      filename={`devfest-${session.id}.ics`}
      event={{
        title: session.title,
        description: localized(session.description, locale),
        location: session.roomName,
        start: session.startsAt,
        end: session.endsAt,
        url: `${siteConfig.url}/${locale}/agenda`,
      }}
    />
  </div>
)}
```
(`AddToCalendar` is a client component; `SessionCard` is an RSC — rendering a client child from an RSC is fine.)

- [ ] **Step 2: Verify against seed data**

Seed sessions have non-null `startsAt`. Run `PORT=3100 pnpm dev`, temporarily nothing to flip — the agenda is gated by `schedulePublished`, but you can render a SessionCard in isolation OR trust the conditional. Minimum: `pnpm lint` clean + `pnpm build` succeeds.

Run: `pnpm build`
Expected: build completes, no type error in SessionCard.

- [ ] **Step 3: Commit**

```bash
git add src/components/agenda/SessionCard.tsx
git commit -m "feat: per-session add-to-calendar (active when schedule has times)"
```

---

## Task 5: PWA — manifest + icons + metadata wiring

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icons/` PNGs (192, 256, 512, 512-maskable)
- Modify: `src/app/[locale]/layout.tsx` (`generateMetadata`: add manifest, themeColor, appleWebApp, icons)

**Interfaces:**
- Produces: `/manifest.webmanifest` route; metadata links.

- [ ] **Step 1: Generate icon PNGs from the brackets logo**

Find the source logo: `pnpm exec grep -rl "" public/images | grep -i "logo\|favicon\|bracket" ` (or `ls public/images`). If only an SVG exists, render PNGs with sharp:
Run: `pnpm dlx sharp-cli --version || pnpm add -D sharp`
Then generate (adjust source path to the actual logo SVG/PNG found):
```bash
node -e '
const sharp = require("sharp");
const src = "public/images/<LOGO_SOURCE>"; // set to the found logo
const out = "public/icons";
require("fs").mkdirSync(out, {recursive:true});
const sizes = [192, 256, 512];
Promise.all([
  ...sizes.map(s => sharp(src).resize(s, s, {fit:"contain", background:{r:255,g:255,b:255,alpha:1}}).png().toFile(`${out}/icon-${s}.png`)),
  sharp(src).resize(512,512,{fit:"contain",background:{r:255,g:255,b:255,alpha:1}}).png().toFile(`${out}/icon-512-maskable.png`),
]).then(()=>console.log("icons done"));
'
```
Expected: `icons done`; four PNGs in `public/icons/`. (Maskable needs safe padding — `fit:contain` on white gives adequate margin for v1.)

- [ ] **Step 2: Create `src/app/manifest.ts`**

```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: "Official site of DevFest Milano 2026.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "it",
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#4285F4",
    categories: ["events", "technology"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 3: Wire metadata in `layout.tsx` `generateMetadata`**

In the returned `Metadata` object add:
```ts
manifest: "/manifest.webmanifest",
appleWebApp: { capable: true, title: siteConfig.shortName, statusBarStyle: "default" },
icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-256.png" },
```
And add a sibling export in the same file:
```ts
import type { Viewport } from "next";
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};
```

- [ ] **Step 4: Verify manifest serves**

Run: `pnpm build && PORT=3100 pnpm start` (background), then `curl -s localhost:3100/manifest.webmanifest | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.name, j.icons.length)})"`
Expected: `DevFest Milano 2026 4`. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts "src/app/[locale]/layout.tsx" public/icons
git commit -m "feat: PWA web manifest, icons, theme-color + apple meta"
```

---

## Task 6: PWA — service worker + offline page + registrar

**Files:**
- Create: `public/sw.js`
- Create: `src/app/offline/page.tsx`
- Create: `src/components/pwa/RegisterSW.tsx`
- Modify: `src/app/[locale]/layout.tsx` (mount `<RegisterSW />`)

**Interfaces:**
- Produces: SW at `/sw.js`, fixed `/offline` page, `<RegisterSW />` mounted once.

- [ ] **Step 1: Create `src/app/offline/page.tsx` (fixed path, inline IT+EN, no next-intl)**

```tsx
import { GDG, GDG_ORDER } from "@/lib/design/tokens";

export const metadata = { title: "Offline · DevFest Milano 2026" };

export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div>
        <div aria-hidden className="mx-auto mb-6 flex w-40 gap-1">
          {GDG_ORDER.map((g) => (
            <span key={g} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: GDG[g] }} />
          ))}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Sei offline</h1>
        <p className="mt-2 text-muted-foreground">Riconnettiti per continuare.</p>
        <p className="mt-4 text-sm text-muted-foreground">You’re offline — reconnect to continue.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `public/sw.js`**

```js
// DevFest Milano 2026 service worker. Conservative: offline shell only.
const CACHE_VERSION = "devfest-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;        // third-party: passthrough
  if (url.pathname.startsWith("/api/")) return;            // never cache APIs

  // Navigations: network-first, fall back to cached offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons") ||
      /\.(?:png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
```

- [ ] **Step 3: Create `src/components/pwa/RegisterSW.tsx`**

```tsx
"use client";
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
```

- [ ] **Step 4: Mount `<RegisterSW />` in layout**

In `src/app/[locale]/layout.tsx`, import `import { RegisterSW } from "@/components/pwa/RegisterSW";` and render `<RegisterSW />` inside `<body>` (e.g. right after `<SkipLink />`).

- [ ] **Step 5: Verify**

Run: `pnpm build` — expected: success, `/offline` in the route list.
Run: `PORT=3100 pnpm start` (background). Open `localhost:3100` in a browser, DevTools → Application → Service Workers: SW registered & activated; visit `/offline` renders; toggle offline + reload a page → offline fallback shows. Stop server.

- [ ] **Step 6: Commit**

```bash
git add public/sw.js "src/app/offline/page.tsx" src/components/pwa/RegisterSW.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat: PWA service worker, offline fallback page, registrar"
```

---

## Task 7: `email.ts` — normalize + validate (pure, TDD)

**Files:**
- Create: `src/lib/email.ts`
- Test: `src/lib/email.test.ts`

**Interfaces:**
- Produces: `normalizeEmail(raw: string): string` (trim+lowercase), `isValidEmail(email: string): boolean`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "@/lib/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.IT ")).toBe("foo@bar.it");
  });
});

describe("isValidEmail", () => {
  it("accepts a plain address", () => { expect(isValidEmail("a@b.co")).toBe(true); });
  it("rejects missing @", () => { expect(isValidEmail("ab.co")).toBe(false); });
  it("rejects spaces", () => { expect(isValidEmail("a b@c.co")).toBe(false); });
  it("rejects no TLD dot", () => { expect(isValidEmail("a@b")).toBe(false); });
  it("rejects oversize", () => { expect(isValidEmail("x".repeat(250) + "@b.co")).toBe(false); });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test src/lib/email.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/email.ts`**

```ts
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length < 254 && EMAIL_RE.test(email);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test src/lib/email.test.ts` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat: email normalize + validate helpers"
```

---

## Task 8: `/api/subscribe` route + Firestore rule

**Files:**
- Create: `src/app/api/subscribe/route.ts`
- Modify: `firebase/firestore.rules` (add `subscribers` rule)

**Interfaces:**
- Consumes: `getAdminDb()` + `isAdminConfigured` (`@/lib/firebase/admin`), `normalizeEmail`/`isValidEmail` (`@/lib/email`).
- Produces: `POST /api/subscribe` → `{ ok: boolean }`.

- [ ] **Step 1: Add Firestore rule**

In `firebase/firestore.rules`, before the final deny block, add:
```
match /subscribers/{id} {
  allow create: if isValidSubscriber();
  allow read, update, delete: if isAdmin();
}
function isValidSubscriber() {
  return request.resource.data.keys().hasOnly(['email','createdAt','locale','source'])
    && request.resource.data.email is string
    && request.resource.data.email.matches('^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$')
    && request.resource.data.email.size() < 254;
}
```
(Note: the route writes via Admin SDK which bypasses rules; this rule documents intent + protects any future client write. Reads stay admin-only.)

- [ ] **Step 2: Implement the route**

```ts
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { isValidEmail, normalizeEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: { email?: unknown; locale?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Honeypot: bots fill hidden `website`. Pretend success, store nothing.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = getAdminDb();
  if (!isAdminConfigured || !db) {
    // Seed mode / static export: nothing to write. Tell client to fall back.
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const locale = body.locale === "en" || body.locale === "it" ? body.locale : "it";
  await db.collection("subscribers").doc(email).set(
    { email, locale, source: "notify-dialog", createdAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify build + bad-email path**

Run: `pnpm build` — Expected: route compiled (`/api/subscribe` in output).
Run: `PORT=3100 pnpm start` (background), then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -XPOST localhost:3100/api/subscribe -H 'content-type: application/json' -d '{"email":"nope"}'
```
Expected: `400`. And a valid email in seed mode (no Firebase env) returns `503` — both are the designed graceful paths. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/subscribe/route.ts firebase/firestore.rules
git commit -m "feat: /api/subscribe persists notify-me email via Admin SDK"
```

---

## Task 9: Upgrade `NotifyTicketsDialog` with email capture

**Files:**
- Modify: `src/components/common/NotifyTicketsDialog.tsx`
- Modify: `messages/it.json`, `messages/en.json` (extend `notify` namespace)

**Interfaces:**
- Consumes: `/api/subscribe`, `useLocale`, existing dialog markup.

- [ ] **Step 1: Add `notify` keys to BOTH message files**

en (inside existing `notify`):
```json
"emailLabel": "Email", "emailPlaceholder": "you@example.com",
"submit": "Notify me", "success": "You’re on the list ✓",
"error": "Couldn’t save right now — follow below to be notified.",
"privacy": "We’ll only email you about ticket availability."
```
it:
```json
"emailLabel": "Email", "emailPlaceholder": "tu@esempio.com",
"submit": "Avvisami", "success": "Sei in lista ✓",
"error": "Salvataggio non riuscito — segui qui sotto per essere avvisato.",
"privacy": "Useremo l’email solo per avvisarti sui biglietti."
```

- [ ] **Step 2: Add the email form to the dialog**

At top of `NotifyTicketsDialog.tsx` add `"use client"` already present. Add imports:
```tsx
import { useState } from "react";
import { useLocale } from "next-intl";
```
Inside the component, after `const t = useTranslations("notify");`:
```tsx
const locale = useLocale();
const [email, setEmail] = useState("");
const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

async function submit(e: React.FormEvent) {
  e.preventDefault();
  setStatus("loading");
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, locale, website: "" }),
    });
    setStatus(res.ok ? "ok" : "error");
  } catch {
    setStatus("error");
  }
}
```
Then, between the `Dialog.Description` and the communities list `<div className="mt-6 ...">`, insert the form:
```tsx
{status === "ok" ? (
  <p className="mt-5 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm font-medium" aria-live="polite">
    {t("success")}
  </p>
) : (
  <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
    <label htmlFor="notify-email" className="sr-only">{t("emailLabel")}</label>
    {/* honeypot */}
    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
    <div className="flex gap-2">
      <input
        id="notify-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <Button type="submit" size="md" disabled={status === "loading"}>{t("submit")}</Button>
    </div>
    {status === "error" && (
      <p className="text-sm text-gdg-red" aria-live="polite">{t("error")}</p>
    )}
    <p className="text-xs text-muted-foreground">{t("privacy")}</p>
  </form>
)}
```
(`Button` is already imported in this file.)

- [ ] **Step 3: Verify**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/it.json','utf8'));console.log('json ok')"` → `json ok`.
Run: `pnpm lint && pnpm build` — Expected: clean build.
Run dev, open the notify dialog on the hero: email field shows; submitting a bad email is blocked by `type=email required`; submitting a valid one in seed mode shows the error fallback (503) while the follow links remain. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/NotifyTicketsDialog.tsx messages/en.json messages/it.json
git commit -m "feat: notify dialog captures email to /api/subscribe with graceful fallback"
```

---

## Task 10: Update STATUS.md

**Files:**
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Move Batch 1 items from Pending to Done**

In `## ✅ Done (Phase 1)` (or a new `### Batch 1` subsection), note: add-to-calendar (event + per-session), installable PWA with offline fallback, notify-me email capture (`subscribers` collection + `/api/subscribe`). In `## ⏳ Pending`, remove "add-to-calendar" and "PWA offline" from the Phase 2 line; add a note that a `subscribers` collection now exists (admin-read; export manually until an admin UI lands in Batch 2).

- [ ] **Step 2: Commit**

```bash
git add docs/STATUS.md
git commit -m "docs: mark Batch 1 (calendar, PWA, notify capture) done in STATUS"
```

---

## Verification checklist (run before declaring Batch 1 complete)

- [ ] `pnpm test` — calendar + email suites green.
- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — succeeds; routes include `/manifest.webmanifest`, `/offline`, `/api/subscribe`.
- [ ] `pnpm build:static` (STATIC_EXPORT) — succeeds; site degrades (no `/api/subscribe`, dialog falls back to follow links).
- [ ] Manual: hero "add to calendar" → Google opens + ics downloads, opens in a calendar app with correct 10 Oct 09:00–19:00 Europe/Rome times.
- [ ] Manual: SW registers in prod build; `/offline` shows when offline.
- [ ] Manual: notify dialog — bad email blocked, valid email 503-degrades in seed mode (or writes a `subscribers/{email}` doc when Firebase env is set), follow links always present.
- [ ] Both locales (`/it`, `/en`) render all new copy.
