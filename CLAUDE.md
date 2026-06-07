@AGENTS.md

# DevFest Milano 2026

Official website for **DevFest Milano 2026** (10 Oct 2026), co-organized by
**GDG Cloud Milano** and **GDG Milano**. Built with Next.js 16 (App Router) +
Tailwind v4 + Firebase, bilingual IT/EN, GDG four-color design.

**Read `docs/STATUS.md` first** — it tracks what's done and what's pending
(it's the source of truth for project state across machines; Claude's own
memory is local to one machine and not in this repo).

Key facts:
- CFP is open → no real lineup yet. Feature flags in `src/lib/site.ts`
  (`ticketsAvailable`, `speakersPublished`, `schedulePublished`) gate the UI;
  the site shows speaker archetypes + "coming soon" until they're flipped.
- Data layer (`src/lib/data/*`) reads Firestore when configured, else bundled
  seed content — so the site runs with zero env vars.
- i18n uses `proxy.ts` (Next 16 renamed middleware) + next-intl; `params` is a Promise.
- Run dev on a free port: `PORT=3100 pnpm dev` (port 3000 may be taken on this machine).
