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
