import { GDG_ORDER } from "@/lib/design/tokens";
import type {
  LocalizedString,
  Session,
  StoredSpeaker,
  Track,
} from "@/types/models";
import { toEventInstant } from "@/lib/time";
import type { SzAll } from "./types";

function mirror(text: string | null | undefined): LocalizedString {
  const t = text ?? "";
  return { it: t, en: t };
}

/**
 * Whether a session belongs on the public site.
 *
 * Sessionize's API returns whatever the endpoint is configured to expose, which
 * can include proposals that were never accepted — publishing those would
 * announce people who aren't speaking. Filtering here means the site's rule
 * doesn't depend on how the endpoint happens to be set up today.
 *
 * Service sessions (breaks, lunch) carry no review state and always pass.
 */
export function isPubliclyVisible(session: {
  status?: string;
  isConfirmed?: boolean;
  isServiceSession?: boolean;
}): boolean {
  if (session.isServiceSession) return true;
  if ((session.status ?? "").toLowerCase() !== "accepted") return false;
  // Accepted but not yet confirmed means the speaker hasn't committed.
  return session.isConfirmed === true;
}

/** Map a raw Sessionize `/view/All` payload into our content model. */
export function normalizeSessionize(data: SzAll): {
  speakers: StoredSpeaker[];
  sessions: Session[];
  tracks: Track[];
} {
  // category item id -> { name, category title (lowercased) }
  const itemMeta = new Map<number, { name: string; cat: string }>();
  for (const c of data.categories ?? []) {
    for (const it of c.items ?? []) {
      itemMeta.set(it.id, { name: it.name, cat: c.title.toLowerCase() });
    }
  }

  // Colour is assigned from a stable ordering by id, not from display order:
  // DESIGN.md's Signal Rule says a track keeps its hue, and Sessionize's `sort`
  // changes whenever an organizer rearranges rooms — which would otherwise
  // repaint the whole agenda on the next sync. Display order still follows
  // `sort`, so the organizer's arrangement is respected.
  const rooms = [...(data.rooms ?? [])];
  const colourIndex = new Map(
    [...rooms]
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((r, i) => [String(r.id), i] as const),
  );
  // /view/All carries only `roomId` on a session — the `room` string exists in
  // the grid-shaped views, not this one. Reading s.room left roomName undefined
  // on every session, so the agenda cards showed no room and the calendar
  // export went out with an empty location.
  const roomNames = new Map(rooms.map((r) => [String(r.id), r.name] as const));
  const tracks: Track[] = rooms
    .sort((a, b) => a.sort - b.sort)
    .map((r, i) => ({
      id: String(r.id),
      name: { it: r.name, en: r.name },
      color: GDG_ORDER[(colourIndex.get(String(r.id)) ?? i) % GDG_ORDER.length],
      order: r.sort ?? i,
    }));

  // Only sessions that are actually happening, and only the speakers on them.
  const visibleSessions = (data.sessions ?? []).filter(isPubliclyVisible);
  const visibleSessionIds = new Set(visibleSessions.map((s) => String(s.id)));
  const visibleSpeakerIds = new Set(
    visibleSessions.flatMap((s) => (s.speakers ?? []).map(String)),
  );

  const speakers: StoredSpeaker[] = (data.speakers ?? [])
    .filter((s) => visibleSpeakerIds.has(String(s.id)))
    .map((s, i) => ({
    id: s.id,
    fullName: s.fullName,
    tagLine: s.tagLine ?? "",
    bio: mirror(s.bio),
    profilePicture: s.profilePicture ?? null,
    // Drop references to sessions that aren't being published.
    sessionIds: (s.sessions ?? []).map(String).filter((id) => visibleSessionIds.has(id)),
    links: (s.links ?? []).map((l) => ({
      type: l.linkType,
      title: l.title,
      url: l.url,
    })),
    isTopSpeaker: Boolean(s.isTopSpeaker),
    featured: Boolean(s.isTopSpeaker),
    order: i,
  }));

  const sessions: Session[] = visibleSessions.map((s) => {
    let language: "it" | "en" | undefined;
    let level: Session["level"];
    const tags: string[] = [];

    for (const id of s.categoryItems ?? []) {
      const meta = itemMeta.get(id);
      if (!meta) continue;
      const lower = meta.name.toLowerCase();
      if (meta.cat.includes("lang")) {
        language = lower.startsWith("it") ? "it" : "en";
      } else if (meta.cat.includes("level")) {
        level = lower.includes("begin")
          ? "beginner"
          : lower.includes("adv")
            ? "advanced"
            : "intermediate";
      } else {
        tags.push(meta.name);
      }
    }

    return {
      id: s.id,
      title: s.title,
      description: mirror(s.description),
      // Stored as an absolute instant, not the naked wall clock Sessionize
      // sends: everything downstream (prerender, .ics, the client) then agrees
      // regardless of the zone it runs in.
      startsAt: toEventInstant(s.startsAt),
      endsAt: toEventInstant(s.endsAt),
      trackId: s.roomId != null ? String(s.roomId) : undefined,
      roomName:
        s.room ??
        (s.roomId != null ? roomNames.get(String(s.roomId)) : undefined),
      speakerIds: (s.speakers ?? []).map(String),
      tags,
      language,
      level,
      isServiceSession: Boolean(s.isServiceSession),
      featured: false,
    };
  });

  return { speakers, sessions, tracks };
}
