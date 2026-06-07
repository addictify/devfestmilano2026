import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { siteConfig } from "@/lib/site";
import type {
  Session,
  Speaker,
  Sponsor,
  TeamMember,
  Track,
} from "@/types/models";
import {
  seedSessions,
  seedSpeakers,
  seedSponsors,
  seedTeam,
  seedTracks,
} from "./seed";

// Read content from Firestore when configured, otherwise serve seed content so
// the site renders fully during development and before the backend is wired.

async function read<T extends { id: string }>(
  collection: string,
  fallback: T[],
): Promise<T[]> {
  const db = getAdminDb();
  if (!db) return fallback;
  try {
    const snap = await db.collection(collection).get();
    if (snap.empty) return fallback;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  } catch (error) {
    console.error(`[content] Firestore read failed for "${collection}":`, error);
    return fallback;
  }
}

const byOrder = <T extends { order?: number }>(a: T, b: T) =>
  (a.order ?? 999) - (b.order ?? 999);

export async function getSpeakers(): Promise<Speaker[]> {
  const list = await read<Speaker>("speakers", seedSpeakers);
  return [...list].sort(
    (a, b) => byOrder(a, b) || a.fullName.localeCompare(b.fullName),
  );
}

export async function getFeaturedSpeakers(limit = 6): Promise<Speaker[]> {
  const all = await getSpeakers();
  const featured = all.filter((s) => s.featured);
  return (featured.length ? featured : all).slice(0, limit);
}

export async function getSpeaker(id: string): Promise<Speaker | null> {
  const all = await getSpeakers();
  return all.find((s) => s.id === id) ?? null;
}

export async function getTracks(): Promise<Track[]> {
  const list = await read<Track>("tracks", seedTracks);
  return [...list].sort(byOrder);
}

export async function getSessions(): Promise<Session[]> {
  const list = await read<Session>("sessions", seedSessions);
  return [...list].sort((a, b) => {
    if (!a.startsAt && !b.startsAt) return 0;
    if (!a.startsAt) return 1;
    if (!b.startsAt) return -1;
    return a.startsAt.localeCompare(b.startsAt);
  });
}

/** True once the schedule is published (flag) and a real session has a time. */
export async function isSchedulePublished(): Promise<boolean> {
  if (!siteConfig.schedulePublished) return false;
  const sessions = await getSessions();
  return sessions.some((s) => !s.isServiceSession && s.startsAt);
}

export async function getSponsors(): Promise<Sponsor[]> {
  const list = await read<Sponsor>("sponsors", seedSponsors);
  return [...list].filter((s) => s.active).sort(byOrder);
}

export async function getTeam(): Promise<TeamMember[]> {
  const list = await read<TeamMember>("team", seedTeam);
  return [...list].sort(byOrder);
}
