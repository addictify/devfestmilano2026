import type { StoredSpeaker } from "@/types/models";

/**
 * URL slugs for speakers.
 *
 * Sessionize keys speakers by UUID, so the detail pages shipped as
 * `/speakers/a36c3d29-ce68-41e3-8021-d973c85f98ef` — a URL that tells a reader
 * nothing, tells a search engine nothing, and survives being pasted into a
 * message about as well as a barcode.
 */

/** "Tomás García" → "tomas-garcia". */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    // Strip the accents NFD just separated, so "à" becomes "a" rather than
    // vanishing entirely.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A slug per speaker, unique across the roster.
 *
 * Two people can share a name, and a URL can't. Where a name collides, every
 * speaker holding it gets a short suffix from their id — all of them, not just
 * the later ones, because "later" depends on a sort order that changes between
 * syncs and a URL that moves is worse than one that is slightly uglier.
 *
 * The suffix is the exception: with distinct names, which is the usual case,
 * the slug is the name and nothing else.
 */
export function speakerSlugs(speakers: StoredSpeaker[]): Map<string, string> {
  const byBase = new Map<string, StoredSpeaker[]>();
  for (const speaker of speakers) {
    const base = slugify(speaker.fullName) || "speaker";
    const group = byBase.get(base);
    if (group) group.push(speaker);
    else byBase.set(base, [speaker]);
  }

  const slugs = new Map<string, string>();
  for (const [base, group] of byBase) {
    for (const speaker of group) {
      slugs.set(
        speaker.id,
        group.length === 1 ? base : `${base}-${shortId(speaker.id)}`,
      );
    }
  }
  return slugs;
}

/** First run of id characters that survive slugification, up to 6. */
function shortId(id: string): string {
  return slugify(id).replace(/-/g, "").slice(0, 6) || "x";
}
