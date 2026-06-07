const TZ = "Europe/Rome";

function bcp47(locale: string) {
  return locale === "it" ? "it-IT" : "en-GB";
}

/** "09:30" in the event timezone. */
export function formatTime(iso: string | null, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(bcp47(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
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
