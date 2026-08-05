---
target: landing page
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-08-05T17-03-25Z
slug: src-app-locale-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Live countdown + animated "selection in progress" state read as real-time. |
| 2 | Match System / Real World | 4 | Plain dev voice, native date formatting, no unexplained jargon. |
| 3 | User Control and Freedom | 4 | Drawer/popovers dismiss freely, no scroll-jacking, no traps. |
| 4 | Consistency and Standards | 2 | "Submissions are closed" is told twice, verbatim, with the same dead-end CTA (`SpeakerTypesContent` + `CfpSection`). |
| 5 | Error Prevention | 2 | Two same-styled "Register" buttons per community card, two different Bevy URLs, no line saying they're equivalent. |
| 6 | Recognition Rather Than Recall | 4 | Header stays reachable and functional through the full ~8600px scroll on both viewports. |
| 7 | Flexibility and Efficiency | 3 | One-click add-to-calendar and instant IT/EN toggle; no "back to top" on a long page. |
| 8 | Aesthetic and Minimalist Design | 2 | 5 back-to-back sections reuse the identical eyebrow+H2+card-grid recipe; `AgendaPreview` renders raw "01/02/03/04" track numbering. |
| 9 | Error Recovery | 3 | No broken states found; nothing to recover from, nothing exceptional either. |
| 10 | Help and Documentation | 3 | FAQ answers the real questions, but its own "Reach out" line has no link anywhere near it. |
| **Total** | | **31/40** | **Good — up from 29/40** |

## Anti-Patterns Verdict

**LLM assessment:** Not an immediate "AI made this" — the ticket-stub hero panel, the 4-color beam, and the marquee are bespoke and on-brand; no gradient text, no glassmorphism. But the *middle* of the page reads template-first: five consecutive sections share one eyebrow+H2+card-grid recipe, and `AgendaPreview.tsx` still renders raw "01/02/03/04" numbered scaffolding on the tracks — a milder, structural version of the tell rather than a surface one.

**Deterministic scan:** Static AST scan on source = exit 0, clean. Runtime overlay against the live page = **31-46 anti-patterns** (rule-count vs. flagged-instance count differ): `clipped-overflow-container` ×21 (mostly decorative/structural, no actual page-level scroll — confirmed no horizontal overflow at 1280px or 390px), `repeated-section-kickers` ×11 (down from 14 pre-fix), `cramped-padding` ×6 (nav bar + the 5 FAQ items — inspected the FAQ items directly: `AccordionContent` already carries `pb-8`/trigger `py-5`, so this reads as a low-precision heuristic rather than a real 0-padding bug), `all-caps-body` ×3 (unchanged — the eyebrows that were deliberately kept), `gpt-thin-border-wide-shadow` ×2 and `dark-glow` ×1 and `nested-cards` ×1 (all on the signature ticket panel / CFP CTA — confirmed false positives per DESIGN.md, same as the original run), `hero-eyebrow-chip` ×1 (the hero's credibility line, kept deliberately).

**Agreement:** Both assessments agree the eyebrow/kicker repetition is reduced but not gone, and that the numbered-track scaffolding is a real, separate tell from the eyebrow issue. Assessment A additionally surfaced two duplication bugs (CFP-closed message, "Go to the agenda" CTA) that the detector can't see because it doesn't compare text across sections.

## Overall Impression

The five fixes from the prior action plan (phase-aware CTA, WCAG contrast, mobile ticket stub, thinned eyebrows, denser sponsor wall, copy/i18n cleanup) landed and measurably improved the score (29→31) without introducing new defects — `tsc`, lint, and the 51-test Vitest suite are all clean, and no console errors or broken images were found live. What's left is content-level, not code-level: a duplicated CFP-closed message, an unexplained double "Register" CTA per community, the still-numbered agenda tracks, and one real content contradiction (Google listed as Platinum sponsor directly above a footer disclaimer stating Google isn't a sponsor).

## What's Working

1. **The ticket-stub hero panel** — a die-cut "save the date" card with perforation notches, animated 4-color beam, and Milano skyline. Distinctive, on-brand, and now degrades to a real (not just shrunk) compact mobile variant.
2. **Phase-aware CTA logic** — `Hero.tsx` branches cleanly across `ticketsAvailable`/`cfpOpen` so exactly one primary action leads at a time, never a dead disabled button.
3. **Sticky header with an always-reachable primary CTA** — confirmed present at every scroll depth on both viewports.

## Priority Issues

- **[P1] "Google — Platinum" sponsor listing sits above a disclaimer saying Google doesn't sponsor the event.** The sponsor wall lists Google with its wordmark as the Platinum tier; the footer states "Google e il logo Google non sono affiliati e non sponsorizzano l'evento." Both are visible within one scroll session. **Why it matters:** it's a direct, visible contradiction a careful visitor (or Google's own legal team) would notice immediately. **Fix:** if this is seed/placeholder data pending a real sponsor roster, replace it before go-live (STATUS.md already tracks "real sponsor logos" as a go-live item — this makes it more urgent, not just cosmetic); if Google is a genuine sponsor, the footer disclaimer copy needs to change. *Command: `/impeccable clarify` (copy) or a content-only fix.*

- **[P1] The CFP-closed message is told twice, verbatim, with the same dead-end CTA.** `SpeakerTypesContent.tsx` and `CfpSection.tsx` both render "Submissions are closed" with a "Go to the agenda" button to the identical `/agenda` route. **Why it matters:** redundant content dilutes the page and reads as an oversight, not a design choice. **Fix:** collapse to one full CFP block; let the speaker-types slot do something additive instead of restating it. *Command: `/impeccable distill`.*

- **[P2] Two "Register for DevFest" buttons, no disambiguation.** Both community cards carry a same-styled registration CTA to two different Bevy URLs for the same event, with no line explaining they're interchangeable. **Fix:** add a one-line note, or drop the per-card CTA since the hero/footer already carry the primary ticket action. *Command: `/impeccable clarify`.*

- **[P2] Numbered "01/02/03/04" track scaffolding + repeating section recipe.** `AgendaPreview.tsx` renders raw track numbers, and five sections in a row share one eyebrow+H2+card-grid template. **Fix:** drop the numbering (the track names + colors already carry the signal) and vary the treatment on 2-3 of the five sections. *Command: `/impeccable distill` or `/impeccable layout`.*

- **[P3] FAQ's "Reach out" line has no link.** The FAQ lead promises a contact channel that doesn't exist near it — the only email on the page is the sponsor-only address. **Fix:** hyperlink it to a real contact method, or remove the promise. *Command: `/impeccable clarify`.*

No P0 found — no broken links, crashes, or layout breaks.

## Persona Red Flags

**Jordan (first-timer):** Scrolling past "Chi salirà sul palco" → "Submissions are closed" → hits the *dedicated* CFP section repeating the exact same message a few sections later. Then sees two separate "Register for DevFest" buttons under two chapter names for what's been described as one event — nothing says the links are equivalent, a real hesitation point. Then reads the footer's Google-non-affiliation disclaimer right after scrolling past "Google — Platinum" in the sponsor wall.

**Riley (stress-tester):** Two buttons with the same label family ("Go to the agenda") lead to the exact same route with the exact same message — a classic "why does this exist twice" finding. Locale/theme toggling, dropdown open/close, and resize all held up without breakage.

**Casey (mobile):** Hero, ticket stub, and drawer menu hold up well with clean tap targets. The friction point: the Theme and Speaker-archetype sections each force ~4 consecutive full-height single-column card swipes of visually near-identical white cards — on a 390px screen it reads as "did anything change, or am I still in the same section?"

## Minor Observations

- Uneven whitespace gap between the end of `AgendaPreview` and the next section, on both viewports — that section is now sparser (post-eyebrow-cut) than its neighbors but keeps the same `py-20 sm:py-28`, so the gap reads bigger than elsewhere.
- Sponsor tier cards (Platinum/Gold/Location Partner) read close in visual size; tier hierarchy leans mostly on the caption text. (Sizes do differ — `w-96` vs `w-72` — but the difference is subtle at a glance.)
- No true broken images: sponsor logos briefly reported `naturalWidth: 0` before scroll due to native lazy-loading, not an actual defect — confirmed correct once scrolled into view.
- `clipped-overflow-container` ×21 detector hits are real `overflow-hidden` usage but none caused actual page-level horizontal scroll at either viewport — contained/intentional (marquees, rounded card corners), not a rendering bug.
- Detector false positives confirmed and unchanged from the original run: `dark-glow` (intentional Tinted-Glow CTA) and `gpt-thin-border-wide-shadow` + `nested-cards` (the signature ticket panel) — all deliberate per DESIGN.md.
