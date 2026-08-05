---
name: DevFest Milano 2026
description: The official site for a developer festival, drafted like an engineering blueprint of Milano in four Google colors.
colors:
  gdg-blue: "#4285F4"
  gdg-red: "#EA4335"
  gdg-yellow: "#FBBC04"
  gdg-green: "#34A853"
  gdg-blue-solid: "#1A73E8"
  gdg-red-solid: "#D93025"
  gdg-green-solid: "#188038"
  background: "#FBFAF6"
  foreground: "#17150F"
  card: "#FFFFFF"
  muted: "#F0EDE3"
  muted-foreground: "#6B6658"
  border: "#E6E2D6"
  paper: "#F3F0E7"
  background-dark: "#0F0E0C"
  foreground-dark: "#F4F1E9"
  card-dark: "#1A1815"
  muted-dark: "#1C1A16"
  muted-foreground-dark: "#A39E90"
  border-dark: "#2B2823"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 11vw, 8rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.5vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
    fontFeature: "ss01, cv01"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  field: "9999px"
  card: "1.5rem"
  panel: "2rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2rem"
  xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.pill}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
  button-accent:
    backgroundColor: "{colors.gdg-blue-solid}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.25rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 1.25rem"
    height: "2.75rem"
  badge:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: "0.125rem 0.625rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "2rem"
---

# Design System: DevFest Milano 2026

## 1. Overview

**Creative North Star: "The Engineering Blueprint of Milano"**

This is a developer festival drawn the way developers draw: on a precision grid, with technical labels, in the four signal colors of the Google Developer ecosystem. The page sits on a faint engineering lattice (a 22px radial dot field over 64px line grid), the way a draftsman's sheet sits under a drawing. The four GDG colors (blue, red, yellow, green) are never decoration; they are signal, mapped deterministically from keys so every track, community, and section earns a consistent hue. Milano is present as geometry, the Duomo silhouette and the ticket-stub `10.10`, not as a postcard. The warm paper ground (`#FBFAF6`) keeps the whole thing human and Italian rather than cold and terminal.

The system is **systematic but warm, technical but legible, energetic but disciplined**. Bricolage Grotesque headlines run oversized and tight; Hanken Grotesk carries body copy with real warmth and clean diacritics for Italian; JetBrains Mono appears only as accent (eyebrows, the countdown, save-the-date labels). Motion is choreographed on first load (staggered hero reveal, drifting color blobs, a shimmering four-color beam) and otherwise quiet, always with a `prefers-reduced-motion` path.

It explicitly rejects the four anti-references in PRODUCT.md: the **generic corporate conference** (no clapping stock photos, no blue gradients, no lanyard clichés), the **over-designed agency showcase** (no scroll-jacking, no heavy WebGL, ambition stays fast), the **sterile cold dev-tool** (mono is an accent, never the whole costume), and the **cheap amateur meetup** (consistent spacing and craft signal the event is run well).

**Key Characteristics:**
- A faint engineering grid (dot + line lattice) underlies hero and atmosphere.
- Four GDG colors used as deterministic signal, never confetti.
- Oversized, tightly-tracked grotesque display over warm humanist body.
- Mono reserved for technical accents: eyebrows, countdown, save-the-date labels.
- Warm paper ground in light, deep warm-charcoal in dark; both meet the same contrast bar.
- Choreographed first-load motion, quiet thereafter, reduced-motion honored globally.

## 2. Colors

A warm, near-neutral canvas that exists to make the four saturated Google colors land as precise signal.

### Primary
- **GDG Blue** (`#4285F4`): The lead brand color and default accent. Drives the primary CTA fill (`button-accent`), the focus ring, the first hero blob, GDG Milano's identity, and the first digit of `2026`. The system's "first voice".

### Secondary
- **GDG Red** (`#EA4335`): The energetic counter-accent. The `10.10` separator dot, the second hero blob, map/location markers, the second `2026` digit.
- **GDG Yellow** (`#FBBC04`): The highlight. Text selection background, the third `2026` digit. Used at slightly higher soft-fill opacity (`/15`) because yellow reads faint.
- **GDG Green** (`#34A853`): The grounding accent. GDG Cloud Milano's identity, the third hero blob, the fourth `2026` digit.

### Neutral
- **Ink** (`#17150F`, warm near-black): Body and heading text on light; also the primary button fill. Warm rather than pure black.
- **Paper** (`#FBFAF6` background / `#F3F0E7` paper / `#FFFFFF` card): The three-step warm light ground. Cards sit pure white above the paper sections above the background.
- **Muted Sand** (`#F0EDE3` surface / `#6B6658` muted-foreground / `#E6E2D6` border): Quiet fills, secondary text, and hairline dividers in the warm-neutral family.
- **Night** (dark theme: `#0F0E0C` background / `#F4F1E9` ink / `#1A1815` card / `#A39E90` muted-foreground / `#2B2823` border): The same warmth carried into dark; charcoal that's warm, never blue-black.

### Named Rules
**The Signal Rule.** The four GDG colors are signal, not decoration. Each is assigned deterministically (`colorForKey`) from a track id, index, or name, so the same entity is always the same color. Never sprinkle all four at once as confetti, and never use a brand color where a neutral would do.

**The No-Lonely-Color Rule.** Color is never the only carrier of meaning (WCAG, color-blind safety). A GDG hue always rides alongside text, an icon, or a position. A green dot without a label is forbidden.

**The Accessible-Fill Rule.** The raw GDG hues (`#4285F4`/`#EA4335`/`#34A853`) are ~3-3.9:1 against white, under WCAG AA's 4.5:1 for text. Any element that sets white text *directly on* a full-strength brand fill (filled buttons, active/selected pills) uses the darkened `-solid` shade instead (`gdg-blue-solid` `#1A73E8`, `gdg-red-solid` `#D93025`, `gdg-green-solid` `#188038`, each ≥4.5:1 with white) — see `colorClasses[color].solidBg` / `.onSolid` in `src/lib/design/tokens.ts`. Yellow has no `-solid` variant: it pairs with ink text (`onSolid: text-foreground`) instead, since darkening it enough for white text would kill the hue. The raw hues stay unchanged everywhere else (blobs, rings, dots, borders, soft tints) — those are decorative signal, not a text background, so the Accent Glow's `rgba(66,133,244,0.6)` tint is deliberately the raw blue, not the solid shade.

## 3. Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui fallback)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui fallback)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback)

**Character:** A characterful, slightly idiosyncratic grotesque for oversized headlines paired with a warm, highly legible humanist sans that handles Italian diacritics gracefully, with a precise monospace reserved for technical accents. The contrast axis is grotesque-display against humanist-body, not two near-identical sans.

### Hierarchy
- **Display** (800, `clamp(3rem, 11vw, 8rem)`, line-height 0.9, tracking -0.02em): The hero `DevFest Milano 2026` only. The four-color `2026` lives here.
- **Headline** (700, `clamp(2.25rem, 5vw, 3.75rem)`, line-height 0.98): Section titles (`SectionHeading` h2), `text-balance` applied.
- **Title** (600, ~1.5rem, line-height 1.1): Card titles, mobile nav links, the ticket-panel `10.10`.
- **Body** (400, `clamp(1.125rem, 1.5vw, 1.25rem)`, line-height 1.6, features ss01/cv01): Leads and prose, capped at ~65ch (`max-w-xl`/`max-w-3xl`), `text-pretty` applied.
- **Label** (500, 0.75rem, tracking 0.18em, UPPERCASE, mono): The `.eyebrow` kicker, badges, countdown units, save-the-date. The only place caps and wide tracking are allowed.

### Named Rules
**The Mono-Is-Accent Rule.** JetBrains Mono never sets body copy or headings. It is confined to eyebrows, the countdown, badges, and save-the-date labels. Mono as body would tip the brand into the "sterile cold dev-tool" anti-reference.

**The Thinned-Eyebrow Rule.** The `.eyebrow` kicker is voice, not scaffolding: it does not appear above every section. On the home page it's reserved for sections where it adds information the heading doesn't already carry (Hero's presenting line, live CFP/selection state, organizer/sponsor framing) — sections whose kicker only restated the `<h2>` (Agenda, Venue, FAQ, Past Editions) ship without one. Never stack two `.eyebrow`-styled elements in the same section (a second in-section label, e.g. a sub-heading over a stats grid, uses plain `text-sm font-semibold text-muted-foreground` instead). Before adding a new one, ask whether the section reads fine without it; default to no.

**The Tight-Display Rule.** Display and headline always track at -0.02em with line-height ≤0.98. Headlines hug; body breathes (1.6). Never flatten the contrast between them.

## 4. Elevation

The system is **mostly flat with purposeful, colored lift**. Surfaces rest on a hairline border (`#E6E2D6`) and tonal layering (background → paper → white card), not on shadows. Shadow appears in exactly two roles: a soft realistic drop under the hero ticket panel for depth, and a *colored glow* under the accent button so the primary CTA reads as lit-from-within. Depth is conveyed by the warm tonal stack and the engineering grid, not by stacking gray shadows.

### Shadow Vocabulary
- **Panel drop** (`box-shadow: 0 30px 80px -40px rgba(0,0,0,0.4)`): The hero ticket panel only. Large, soft, far-offset; reads as a physical card floating over paper.
- **Accent glow** (`box-shadow: 0 8px 24px -8px rgba(66,133,244,0.6)`): Under the blue accent button. A *tinted* glow, not a gray shadow; the CTA looks energized.
- **Hairline lift** (`box-shadow: 0 1px 0 0 rgba(0,0,0,0.04)`): The primary (ink) button. A single-pixel top edge, barely-there.

### Named Rules
**The Tinted-Glow Rule.** When an element must pop (the primary CTA), it glows in its own hue, never in gray. Gray drop shadows on interactive elements are forbidden; they read as 2014.

**The Border-First Rule.** Separation is a 1px warm border or a tonal step first, a shadow only when an element must physically float. Default surfaces are flat.

## 5. Components

The component feel is **crisp and tactile**: fully-rounded pills, a subtle lift on hover, a 0.98 press scale, all on the `ease-out-expo` curve (`cubic-bezier(0.16, 1, 0.3, 1)`). Responsive and physical without shouting.

### Buttons
- **Shape:** Fully rounded pills (`9999px`) at every size. Heights: sm 2.25rem, md 2.75rem, lg 3.25rem.
- **Primary:** Ink fill (`#17150F`) on background text, hairline top-edge shadow, hover dims to 90%. The default, confident and quiet.
- **Accent:** GDG Blue fill, white text, blue glow shadow, hover brightens 110% and lifts -2px. The single energized CTA (tickets / register).
- **Outline:** Transparent with a 1px border, hover fills muted and darkens the border. Secondary actions (CFP).
- **Ghost / Link:** Transparent; ghost fills muted on hover, link underlines on hover.
- **All states:** 200ms `ease-out-expo`, `active:scale-[0.98]`, visible focus ring (2px, blue, 2px offset), `disabled:opacity-50`.

### Badges / Chips
- **Style:** Pill, white card background, 1px warm border, mono uppercase 0.7rem at 0.18em tracking, muted-foreground text. Used for date/place pills and metadata.

### Cards / Containers
- **Corner Style:** Generous 1.5rem radius (panels 2rem).
- **Background:** Pure white (`#FFFFFF`) above paper/background sections.
- **Shadow Strategy:** Flat by default (Border-First Rule); the hero ticket panel is the exception with the Panel drop.
- **Border:** 1px warm border (`#E6E2D6` light / `#2B2823` dark).
- **Internal Padding:** 2rem (`lg`).
- **Signature accent:** Many cards and sections carry the four-color top beam (`.beam-4`): blue/red/yellow/green in equal 25% bands.

### Navigation
- **Style:** Sticky top bar, transparent at rest, gains an 80%-opacity background with `backdrop-blur-xl` and a hairline bottom border once scrolled past 12px.
- **Links:** Pill hover fill (muted), active link goes full-ink, inactive stays muted-foreground, 14px medium.
- **Mobile:** Radix dialog drawer sliding in from the right with a four-color top bar (`GdgColorBar`), oversized display-font links, slide-in on `ease-out-expo`.

### Signature: The Ticket Panel + Countdown
The hero's right column is a literal event ticket: a white card with a shimmering animated four-color beam, faint vertical color stripes, the oversized `10.10` stub with a red separator dot, `/ 2026 · Milano` in mono, a floating Duomo silhouette, and two punched perforation circles cut from the background on the left and right edges. The live `Countdown` renders days/hours/minutes/seconds in mono. This pairing is the brand's most distinctive asset; treat it as the centerpiece, not a widget.

## 6. Do's and Don'ts

### Do:
- **Do** assign GDG colors deterministically with `colorForKey`; the same track or community is always the same hue (the Signal Rule).
- **Do** keep the warm paper ground (`#FBFAF6`) and let the four colors carry energy against it.
- **Do** pair every color signal with text, an icon, or position; never color alone (the No-Lonely-Color Rule).
- **Do** confine JetBrains Mono to eyebrows, the countdown, badges, and labels (the Mono-Is-Accent Rule).
- **Do** track display/headline at -0.02em with line-height ≤0.98, and let body breathe at 1.6.
- **Do** make interactive elements crisp and tactile: pill radius, -2px hover lift on the accent CTA, 0.98 press, `ease-out-expo`.
- **Do** glow the primary CTA in its own blue hue, never gray (the Tinted-Glow Rule).
- **Do** keep cards flat with a 1px warm border by default; reserve real shadow for things that physically float (the Border-First Rule).
- **Do** ship a `prefers-reduced-motion` path for every entrance, blob, beam, and marquee.
- **Do** treat both IT and EN as first-class; test layouts at longer Italian strings.

### Don't:
- **Don't** read as a **generic corporate conference**: no clapping stock photos, no blue-on-blue gradients, no lanyard clichés, no Eventbrite-template feel.
- **Don't** become an **over-designed agency showcase**: no scroll-jacking, no heavy WebGL, no animation that blocks content or slows first load.
- **Don't** turn into a **sterile cold dev-tool**: mono is never body copy, the dark theme stays warm charcoal (never blue-black terminal), human warmth stays.
- **Don't** look like a **cheap amateur meetup**: no clip art, no default component styling, no inconsistent spacing; craft is the proof the event is well run.
- **Don't** use gradient text (`background-clip: text`) anywhere; emphasis comes from weight, size, and the four solid colors.
- **Don't** add side-stripe `border-left`/`border-right` accents on cards or callouts; use the full four-color top beam (`.beam-4`) instead.
- **Don't** scatter all four GDG colors as random confetti, or use a brand color where a neutral belongs (the Signal Rule).
- **Don't** put gray drop shadows on buttons or cards at rest; flat with a hairline border, or a tinted glow when it must pop.
