import { GDG_ORDER } from "@/lib/design/tokens";
import type {
  LocalizedString,
  Session,
  Speaker,
  Track,
} from "@/types/models";
import type { SzAll } from "./types";

function mirror(text: string | null | undefined): LocalizedString {
  const t = text ?? "";
  return { it: t, en: t };
}

/** Map a raw Sessionize `/view/All` payload into our content model. */
export function normalizeSessionize(data: SzAll): {
  speakers: Speaker[];
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

  const tracks: Track[] = [...(data.rooms ?? [])]
    .sort((a, b) => a.sort - b.sort)
    .map((r, i) => ({
      id: String(r.id),
      name: { it: r.name, en: r.name },
      color: GDG_ORDER[i % GDG_ORDER.length],
      order: r.sort ?? i,
    }));

  const speakers: Speaker[] = (data.speakers ?? []).map((s, i) => ({
    id: s.id,
    fullName: s.fullName,
    tagLine: s.tagLine ?? "",
    bio: mirror(s.bio),
    profilePicture: s.profilePicture ?? null,
    sessionIds: (s.sessions ?? []).map(String),
    links: (s.links ?? []).map((l) => ({
      type: l.linkType,
      title: l.title,
      url: l.url,
    })),
    isTopSpeaker: Boolean(s.isTopSpeaker),
    featured: Boolean(s.isTopSpeaker),
    order: i,
  }));

  const sessions: Session[] = (data.sessions ?? []).map((s) => {
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
      startsAt: s.startsAt ?? null,
      endsAt: s.endsAt ?? null,
      trackId: s.roomId != null ? String(s.roomId) : undefined,
      roomName: s.room ?? undefined,
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
