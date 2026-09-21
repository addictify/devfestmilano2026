import { fromZonedTime } from "date-fns-tz";

const TZ = "Europe/Rome";

function bcp47(locale: string) {
  return locale === "it" ? "it-IT" : "en-GB";
}

/** `2026-10-10T09:30:00` — a wall clock with no timezone attached. */
const OFFSETLESS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * An absolute instant from a Sessionize timestamp.
 *
 * Sessionize emits the event's own wall clock with no offset, and `new Date()`
 * then resolves it against whatever zone the runtime happens to be in. The
 * agenda is a client component, so the browser read 09:30 as Italian time and
 * got it right; the speaker pages are server components prerendered in CI,
 * where the zone is UTC, so the same string became 11:30 and shipped that way.
 * The .ics exports were built from it too.
 *
 * A wall clock is only a time once you say where, so say where.
 */
export function toEventInstant(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = OFFSETLESS.test(iso) ? fromZonedTime(iso, TZ) : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "09:30" in the event timezone. */
export function formatTime(iso: string | null, locale: string): string {
  if (!iso) return "";
  // Also parses timestamps stored before toEventInstant existed, so a page is
  // correct even against data that hasn't been re-synced yet.
  const instant = toEventInstant(iso);
  if (!instant) return "";
  return new Intl.DateTimeFormat(bcp47(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(instant));
}

/** "09:30 – 10:15" */
export function formatTimeRange(
  start: string | null,
  end: string | null,
  locale: string,
): string {
  const s = formatTime(start, locale);
  const e = formatTime(end, locale);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

/** "Sabato 10 ottobre 2026" */
export function formatLongDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(bcp47(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}
