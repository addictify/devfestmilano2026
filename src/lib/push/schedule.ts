import { formatInTimeZone } from "date-fns-tz";
import { formatTime, romeInputToIso, toEventInstant } from "@/lib/time";

/**
 * Scheduled announcements: what to send, and when.
 *
 * Kept pure: the cron tick and the admin form both lean on these decisions,
 * and a wrong one is a buzz in every pocket at the wrong moment.
 */

const TZ = "Europe/Rome";

export type ScheduledStatus = "pending" | "sending" | "sent" | "failed" | "missed";

/** How late a pending item may still go out. A "lunch is served" an hour
 *  after lunch is worse than none, so past this it is marked missed. */
export const GRACE_MINUTES = 30;

/** Pending items whose time has come, and those that came too long ago. */
export function dueScheduled<T extends { sendAt: string | null; status: string }>(
  items: T[],
  now: Date,
  graceMinutes = GRACE_MINUTES,
): { due: T[]; missed: T[] } {
  const due: T[] = [];
  const missed: T[] = [];
  for (const item of items) {
    if (item.status !== "pending" || !item.sendAt) continue;
    const at = new Date(item.sendAt).getTime();
    if (!Number.isFinite(at) || at > now.getTime()) continue;
    (now.getTime() - at > graceMinutes * 60_000 ? missed : due).push(item);
  }
  return { due, missed };
}

const MAX_AHEAD_MS = 60 * 24 * 60 * 60_000;

/** A send time from the admin: a real instant, not in the past, and not
 *  months away (which would be a typo in the year). */
export function parseScheduleTime(value: unknown, now: Date): string | null {
  if (typeof value !== "string") return null;
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return null;
  if (at < now.getTime() - 60_000 || at > now.getTime() + MAX_AHEAD_MS) return null;
  return new Date(at).toISOString();
}

type SessionLike = {
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  roomName?: string;
  isServiceSession: boolean;
};

export type TemplateKind = "eve" | "welcome" | "coffee" | "lunch" | "closing";

export type ScheduleTemplate = {
  kind: TemplateKind;
  /** Admin-facing name of the preset. */
  label: string;
  sendAt: string;
  titleIt: string;
  bodyIt: string;
  titleEn: string;
  bodyEn: string;
};

// Sessionize titles are typed by hand ("Coffe Break", "Ceck In"): match loosely.
const KINDS: Record<Exclude<TemplateKind, "eve"> | "checkin", RegExp> = {
  checkin: /c\w*k[\s-]?in|registra|accredit/i,
  welcome: /welcome|benvenut|opening|apertura/i,
  coffee: /\bcof+e+|caff[eè]/i,
  lunch: /lunch|pranzo/i,
  closing: /closing|chiusura|saluti|goodbye|wrap/i,
};

type Slot = { start: string; end: string | null; room?: string };

/** Service sessions of one kind, one per start time (the same break is
 *  listed once per room), earliest first. */
function slots(sessions: SessionLike[], re: RegExp): Slot[] {
  const byStart = new Map<string, Slot>();
  for (const s of sessions) {
    if (!s.isServiceSession || !re.test(s.title)) continue;
    const start = toEventInstant(s.startsAt);
    if (!start || byStart.has(start)) continue;
    byStart.set(start, { start, end: toEventInstant(s.endsAt), room: s.roomName });
  }
  return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
}

const minus = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() - minutes * 60_000).toISOString();

const hm = (iso: string | null, locale: "it" | "en") => (iso ? formatTime(iso, locale) : "");

/**
 * Ready-made announcements for the day, timed from the agenda: the evening
 * reminder, the welcome, each coffee break, lunch and the goodbye. Copy is a
 * starting point — the admin edits it before scheduling.
 */
export function scheduleTemplates(
  sessions: SessionLike[],
  { eventDate, venue }: { eventDate: string; venue: string },
): ScheduleTemplate[] {
  const out: ScheduleTemplate[] = [];
  const checkin = slots(sessions, KINDS.checkin)[0];

  // The evening before, 18:00 Milan time.
  const eventDay = formatInTimeZone(new Date(eventDate), TZ, "yyyy-MM-dd");
  const dayBefore = new Date(`${eventDay}T12:00:00Z`);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const eveAt = romeInputToIso(`${dayBefore.toISOString().slice(0, 10)}T18:00`);
  const dayIt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(eventDate));
  const dayEn = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(eventDate));
  if (eveAt) {
    out.push({
      kind: "eve",
      label: "Promemoria del giorno prima",
      sendAt: eveAt,
      titleIt: "Domani è DevFest Milano!",
      bodyIt: checkin
        ? `Ci vediamo ${dayIt} al ${venue}. Check-in dalle ${hm(checkin.start, "it")}: porta il biglietto e tanta curiosità!`
        : `Ci vediamo ${dayIt} al ${venue}: porta il biglietto e tanta curiosità!`,
      titleEn: "DevFest Milano is tomorrow!",
      bodyEn: checkin
        ? `See you on ${dayEn} at ${venue}. Check-in opens at ${hm(checkin.start, "en")} — bring your ticket and your curiosity!`
        : `See you on ${dayEn} at ${venue} — bring your ticket and your curiosity!`,
    });
  }

  const welcome = slots(sessions, KINDS.welcome)[0];
  if (welcome) {
    out.push({
      kind: "welcome",
      label: "Benvenuto",
      // A few minutes ahead, so people head for the room in time.
      sendAt: minus(welcome.start, 10),
      titleIt: "Benvenuti a DevFest Milano 2026!",
      bodyIt: `L'apertura inizia alle ${hm(welcome.start, "it")}${welcome.room ? ` in sala ${welcome.room}` : ""}. Buon DevFest!`,
      titleEn: "Welcome to DevFest Milano 2026!",
      bodyEn: `The opening starts at ${hm(welcome.start, "en")}${welcome.room ? ` in ${welcome.room}` : ""}. Enjoy DevFest!`,
    });
  }

  for (const c of slots(sessions, KINDS.coffee)) {
    out.push({
      kind: "coffee",
      label: `Coffee break ${hm(c.start, "it")}`,
      sendAt: c.start,
      titleIt: "Pausa caffè",
      bodyIt: c.end ? `Ricarica le energie: si riprende alle ${hm(c.end, "it")}.` : "Ricarica le energie!",
      titleEn: "Coffee break",
      bodyEn: c.end ? `Time to recharge: sessions resume at ${hm(c.end, "en")}.` : "Time to recharge!",
    });
  }

  const lunch = slots(sessions, KINDS.lunch)[0];
  if (lunch) {
    out.push({
      kind: "lunch",
      label: "Pranzo",
      sendAt: lunch.start,
      titleIt: "Il pranzo è servito",
      bodyIt: lunch.end ? `Buon appetito! Le sessioni riprendono alle ${hm(lunch.end, "it")}.` : "Buon appetito!",
      titleEn: "Lunch is served",
      bodyEn: lunch.end ? `Enjoy your meal! Sessions resume at ${hm(lunch.end, "en")}.` : "Enjoy your meal!",
    });
  }

  const closing = slots(sessions, KINDS.closing)[0];
  if (closing) {
    out.push({
      kind: "closing",
      label: "Saluti",
      // As the closing ends, when people are on their way out.
      sendAt: closing.end ?? closing.start,
      titleIt: "Grazie di essere stati con noi!",
      bodyIt: "DevFest Milano 2026 si chiude qui. Lascia un voto ai talk che hai seguito e ci vediamo alla prossima!",
      titleEn: "Thanks for joining us!",
      bodyEn: "That's a wrap on DevFest Milano 2026. Rate the talks you saw, and see you next time!",
    });
  }

  return out.sort((a, b) => a.sendAt.localeCompare(b.sendAt));
}
