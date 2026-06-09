# Product

## Register

product

> Note: the **default** register is `product`, set with the Phase 2/3 roadmap in
> mind (Google Sign-In + "My Schedule" favorites, PWA, gamification, organizer
> dashboard). The **current** public surface is brand-shaped (landing + event
> pages, oversized hero, scroll-driven sections). Expect to override to `brand`
> per task when working those marketing pages; reach for `product` on anything
> behind auth or in a tool/dashboard flow.

## Users

- **Prospective & returning attendees** — Milan-area and Italian developers
  (Android, Web, Cloud, AI), students, and tech professionals deciding whether
  DevFest Milano 2026 is worth their Saturday on **10 October 2026**. They browse
  on mobile, often mid-commute, comparing this against other events. The job:
  understand what the day offers, who's speaking (eventually), and how to get a
  ticket — fast, in IT or EN.
- **Prospective speakers** — developers and GDEs weighing the CFP (open until
  31 July 2026). The job: gauge the event's credibility and audience, then submit.
- **Prospective sponsors** — companies evaluating reach and fit. The job: see the
  audience numbers and tiers, then make contact.
- **Organizers & volunteers** (two GDG communities, GDG Cloud Milano + GDG Milano)
  — the future product audience: managing content and, in later phases, running
  on-the-day tools (My Schedule, gamification, feedback, organizer dashboard).

## Product Purpose

The official website for **DevFest Milano 2026**, co-organized by GDG Cloud
Milano and GDG Milano. While the CFP is open there's no confirmed lineup, so the
site's job is to **build anticipation and convert intent**: sell the event on its
2025 track record (300 attendees, 20+ speakers, 20+ sessions, 3 tracks), drive
CFP submissions, surface sponsors, and capture ticket interest until Bevy opens.
Feature flags (`ticketsAvailable`, `speakersPublished`, `schedulePublished` in
`src/lib/site.ts`) gate the UI so the same codebase flips into a full speaker
directory + multi-track agenda the moment the program is set.

Later phases turn the marketing site into a product: signed-in attendees build a
personal schedule, an offline PWA, add-to-calendar, then a gamification layer
(QR scavenger hunt, points, badges, leaderboard), live session feedback, and an
organizer dashboard.

Success: developers leave the site knowing the date, trusting the event, and
having taken the next step available to them (submit a talk now, grab a ticket
later) — bilingual, fast, and unmistakably a Google Developer Group event.

## Brand Personality

Three words: **energetic, communal, credible.**

- **Voice:** plain-spoken and developer-to-developer. No marketing buzzwords, no
  hype that the event hasn't earned. Concrete nouns (dates, numbers, tracks,
  venue) over adjectives. Bilingual IT/EN with equal care.
- **Emotional goal (in priority order):** excitement and momentum (a flagship day
  worth clearing the calendar for, reinforced by the live countdown); community
  and belonging (two GDGs, volunteers, developers like you); curiosity and
  discovery (a program worth exploring); and credibility at scale (real venue,
  real numbers, the Google ecosystem). The countdown, four-color motion, and
  Duomo motif carry the energy; the 2025 numbers and named team carry the trust.

## Anti-references

The site must NOT read as any of these:

- **Generic corporate conference** — stock photos of people clapping, blue
  gradients, lanyard clichés, soulless Eventbrite/template feel.
- **Over-designed agency showcase** — heavy WebGL, scroll-jacking, slow loads,
  style crushing function. Ambition must stay fast and legible.
- **Sterile / cold dev-tool** — all-mono, dark-terminal, no human warmth. Mono is
  an accent here (eyebrows, countdown, labels), never the whole costume.
- **Cheap / amateur meetup** — clip art, default Bootstrap, inconsistent spacing,
  thrown-together. Craft and consistency signal that the event itself is run well.

## Design Principles

1. **Earn the hype with proof.** Energy is welcome, but every excited claim sits
   next to a concrete fact (2025 numbers, real venue, named organizers). Show the
   track record; don't just assert it.
2. **The four colors are the brand, used with discipline.** GDG blue/red/yellow/
   green is the signature, mapped deterministically (`colorForKey`) so it stays
   systematic, not confetti. Color carries identity; warmth comes from type and
   the paper ground, not from tinting everything.
3. **Fast and legible beats impressive.** Motion and atmosphere (blobs, beams,
   countdown) serve the moment and respect `prefers-reduced-motion`. Nothing
   blocks content or slows the first load. The viewport is part of the design at
   every breakpoint.
4. **Bilingual and inclusive by construction.** IT and EN are first-class; layouts
   survive longer Italian strings. The site works for someone on a phone, on a
   keyboard, with a screen reader, or with motion turned off.
5. **Built to flip from teaser to program.** Feature flags and the seed/Firestore
   data layer mean the "coming soon" surfaces become the real directory and agenda
   without a redesign. Design the placeholder states as carefully as the final
   ones.

## Accessibility & Inclusion

Target **WCAG 2.2 AA.**

- Body text ≥4.5:1 contrast, large text ≥3:1, against both light and dark themes;
  watch the muted-foreground tokens on the warm paper background especially.
- Full keyboard operability with a visible focus ring (already in `globals.css`)
  and a skip link.
- `prefers-reduced-motion` honored globally (already wired) — every entrance,
  blob, beam, and marquee has a reduced-motion path.
- The four-color system must never be the *only* signal (color-blind safe): pair
  it with text, icons, or position.
- Bilingual IT/EN with correct `lang`/`hreflang`; diacritics render cleanly in the
  chosen type.
- Honor dark mode; both themes meet the same contrast bar.
