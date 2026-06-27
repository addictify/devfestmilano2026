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

/** RFC 5545 §3.1: fold lines longer than 75 octets (CRLF + space continuation). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let s = line;
  parts.push(s.slice(0, 75));
  s = s.slice(75);
  while (s.length > 74) {
    parts.push(" " + s.slice(0, 74));
    s = s.slice(74);
  }
  if (s.length) parts.push(" " + s);
  return parts.join("\r\n");
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
    `DTSTAMP:${toCalUtc(new Date().toISOString())}`,
    `DTSTART:${toCalUtc(e.start)}`,
    `DTEND:${toCalUtc(e.end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 §3.1: fold long lines (75-octet limit) and end with CRLF.
  // Line folding uses JS string length as pragmatic approximation of octets (ASCII-dominant fields).
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function icsDataUri(e: CalendarEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(e))}`;
}
