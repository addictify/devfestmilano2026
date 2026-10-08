/**
 * Announcements as the public reads them.
 *
 * The `announcements` collection is admin-only: each row also records who
 * sent it and how delivery went. What leaves the server is only what was on
 * the lock screen — the text and when it was sent.
 */

export type PublicAnnouncement = {
  id: string;
  title: { it: string; en: string | null };
  body: { it: string; en: string | null };
  /** ISO 8601; null while the row is being written. */
  sentAt: string | null;
};

type StoredAnnouncement = {
  titleIt?: unknown;
  bodyIt?: unknown;
  titleEn?: unknown;
  bodyEn?: unknown;
  sentAt?: { toDate(): Date } | null;
};

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

export function toPublicAnnouncement(
  id: string,
  doc: StoredAnnouncement,
): PublicAnnouncement | null {
  const titleIt = text(doc.titleIt);
  const bodyIt = text(doc.bodyIt);
  if (!titleIt || !bodyIt) return null;
  return {
    id,
    title: { it: titleIt, en: text(doc.titleEn) },
    body: { it: bodyIt, en: text(doc.bodyEn) },
    sentAt: doc.sentAt ? doc.sentAt.toDate().toISOString() : null,
  };
}

/** The copy this reader was sent: English only when both fields were written,
 *  matching the choice the admin send makes per subscription. */
export function localizeAnnouncement(
  a: PublicAnnouncement,
  locale: string,
): { title: string; body: string } {
  return locale === "en" && a.title.en && a.body.en
    ? { title: a.title.en, body: a.body.en }
    : { title: a.title.it, body: a.body.it };
}

/** Newest announcement time in a newest-first list (rows mid-write skipped). */
export function latestSentAt(items: PublicAnnouncement[]): string | null {
  return items.find((a) => a.sentAt)?.sentAt ?? null;
}

/** Whether the bell should show a dot: something newer than what this
 *  browser last looked at. ISO strings in UTC compare correctly as text. */
export function hasUnread(items: PublicAnnouncement[], seen: string | null): boolean {
  const latest = latestSentAt(items);
  return latest !== null && (seen === null || latest > seen);
}

/** Same caps as the admin form and the push payload (subscription.ts). */
const MAX_TITLE = 80;
const MAX_BODY = 180;

export type AnnouncementInput = {
  titleIt: string;
  bodyIt: string;
  titleEn: string | null;
  bodyEn: string | null;
};

/** Validate announcement copy from an admin request: Italian required,
 *  English optional, everything trimmed and capped. */
export function parseAnnouncementInput(body: unknown): AnnouncementInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const field = (v: unknown, max: number) => {
    const s = typeof v === "string" ? v.trim().slice(0, max) : "";
    return s || null;
  };
  const titleIt = field(b.titleIt, MAX_TITLE);
  const bodyIt = field(b.bodyIt, MAX_BODY);
  if (!titleIt || !bodyIt) return null;
  return { titleIt, bodyIt, titleEn: field(b.titleEn, MAX_TITLE), bodyEn: field(b.bodyEn, MAX_BODY) };
}

/** Auto-generated Firestore ids are 20 alphanumerics; anything else (paths,
 *  dots) is refused rather than handed to doc(). */
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_IDS = 100;

/** `{ ids: [...] }` from a bulk request, deduped; null when unusable. */
export function parseIdList(body: unknown): string[] | null {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS) return null;
  const clean = [...new Set(ids.filter((v): v is string => typeof v === "string" && ID.test(v)))];
  return clean.length > 0 ? clean : null;
}
