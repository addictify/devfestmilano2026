import type { Session } from "@/types/models";
import { toEventInstant } from "@/lib/time";

/**
 * Collapse the service sessions that Sessionize repeats per room.
 *
 * A break is one break. Sessionize models the schedule as a grid, so a coffee
 * break that stops the whole venue is stored as one row *per room* — three
 * identical "Coffee Break" entries at 11:00 on a three-track day. Printed
 * verbatim, the agenda's spine is three times taller than the day it describes.
 *
 * Sessions are grouped by their exact time span. Within a group the displayed
 * title is the most frequent one, which also absorbs a typo in a single room
 * ("Ceck In" alongside two "Check In") without editing anyone's content.
 *
 * The room label survives only when the block does *not* cover every room in
 * use at that time — a break everywhere needs no room, a break in one room
 * still does. "In use at that time", not "every room of the event": a room
 * that only runs talks at other hours (Secret Track) would otherwise turn
 * every break into "Coworking · Nexus · Workshop".
 */
export function collapseServiceSessions(sessions: Session[]): Session[] {
  const groups = new Map<string, Session[]>();
  const out: Session[] = [];

  for (const s of sessions) {
    if (!s.isServiceSession || !s.startsAt) {
      out.push(s);
      continue;
    }
    const key = `${s.startsAt}|${s.endsAt ?? ""}`;
    const group = groups.get(key);
    if (group) group.push(s);
    else {
      groups.set(key, [s]);
      // Reserve the slot so the collapsed block keeps its place in the order.
      out.push(s);
    }
  }

  if (groups.size === 0) return out;

  const merged = new Map<string, Session>();
  for (const [key, group] of groups) {
    merged.set(key, mergeGroup(group, roomsInUse(sessions, group[0])));
  }

  return out.map((s) => {
    if (!s.isServiceSession || !s.startsAt) return s;
    return merged.get(`${s.startsAt}|${s.endsAt ?? ""}`) ?? s;
  });
}

/** Milliseconds span of a session, or null when it has no schedule. */
function span(s: Session): [number, number] | null {
  const start = toEventInstant(s.startsAt);
  const end = toEventInstant(s.endsAt);
  if (!start || !end) return null;
  return [new Date(start).getTime(), new Date(end).getTime()];
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

/** Rooms with anything scheduled during `ref`'s time span. */
function roomsInUse(sessions: Session[], ref: Session): Set<string> {
  const refSpan = span(ref);
  const rooms = new Set<string>();
  if (!refSpan) return rooms;
  for (const s of sessions) {
    const sSpan = span(s);
    if (s.roomName && sSpan && overlaps(refSpan, sSpan)) rooms.add(s.roomName);
  }
  return rooms;
}

/**
 * Whether a session gets a whole agenda row to itself: a break, or a talk
 * nothing else runs alongside (a keynote). A 20-minute lightning talk that
 * starts at 11:50 is alone in its time row but not in the venue — other rooms
 * are mid-talk until 12:15 — and full width made it read as a plenary.
 */
export function standsAlone(session: Session, all: Session[]): boolean {
  if (session.isServiceSession) return true;
  const own = span(session);
  if (!own) return true;
  return !all.some((o) => {
    if (o.id === session.id || o.isServiceSession) return false;
    const other = span(o);
    return other !== null && overlaps(own, other);
  });
}

function mergeGroup(group: Session[], inUse: Set<string>): Session {
  const first = group[0];
  if (group.length === 1) return first;

  const rooms = [...new Set(group.map((s) => s.roomName).filter(Boolean))] as string[];
  const spansVenue = inUse.size > 0 && [...inUse].every((r) => rooms.includes(r));

  return {
    ...first,
    title: mostFrequent(group.map((s) => s.title)),
    // Merged rows come from different tracks, so neither the track colour nor a
    // single room name applies to the block as a whole.
    trackId: undefined,
    roomName: spansVenue || rooms.length === 0 ? undefined : rooms.join(" · "),
    speakerIds: [...new Set(group.flatMap((s) => s.speakerIds))],
  };
}

export type AgendaFilters = {
  /** Track id, or "all". */
  track: string;
  /** Session language, or "all". */
  lang: "all" | "it" | "en";
  onlyFavorites: boolean;
  favorites: ReadonlySet<string>;
};

/**
 * Whether a session survives the agenda filters.
 *
 * Service sessions always pass. They are the shape of the day, not content to
 * sift: filtering by room used to drop them, so "Workshop" rendered as six
 * talks back to back with no lunch, no coffee and no closing.
 */
export function matchesFilters(session: Session, f: AgendaFilters): boolean {
  if (session.isServiceSession) return true;
  if (f.track !== "all" && session.trackId !== f.track) return false;
  if (f.lang !== "all" && session.language !== f.lang) return false;
  if (f.onlyFavorites && !f.favorites.has(session.id)) return false;
  return true;
}

/** Most common value; ties go to whichever appeared first. */
function mostFrequent(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const n = counts.get(v)!;
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}
