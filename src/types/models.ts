import type { GdgColor } from "@/lib/design/tokens";

/** Bilingual text. Sessionize bios are mirrored into both until translated. */
export type LocalizedString = { it: string; en: string };

export type SessionLevel = "beginner" | "intermediate" | "advanced";

export type SponsorTier =
  | "platinum"
  | "gold"
  | "venue"
  | "silver"
  | "bronze"
  | "community"
  | "inkind";

export interface SpeakerLink {
  type: string; // "Twitter" | "LinkedIn" | "Blog" | "Company_Website" | ...
  title?: string;
  url: string;
}

/**
 * A speaker as stored — in Firestore, in the seed, as Sessionize sends them.
 *
 * `Speaker` adds the URL slug, which is computed from the whole roster when
 * the data is read (lib/slug.ts) rather than written down, so a rename can't
 * strand a stale slug in the database.
 */
export interface StoredSpeaker {
  id: string;
  fullName: string;
  tagLine: string;
  bio: LocalizedString;
  profilePicture: string | null;
  sessionIds: string[];
  links: SpeakerLink[];
  isTopSpeaker: boolean;
  company?: string;
  country?: string;
  /** Editorial: surface on the landing page. */
  featured: boolean;
  order?: number;
}

export interface Session {
  id: string;
  title: string;
  description: LocalizedString;
  /** ISO 8601 (Europe/Rome). `null` until the schedule is published. */
  startsAt: string | null;
  endsAt: string | null;
  trackId?: string;
  roomName?: string;
  speakerIds: string[];
  tags: string[];
  language?: "it" | "en";
  level?: SessionLevel;
  /** Breaks, registration, lunch, keynote framing, etc. */
  isServiceSession: boolean;
  featured: boolean;
}

export interface Track {
  id: string;
  name: LocalizedString;
  color: GdgColor;
  order: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logoLight: string | null;
  logoDark: string | null;
  website: string;
  tier: SponsorTier;
  description?: LocalizedString;
  order: number;
  active: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
  photo: string | null;
  links: SpeakerLink[];
  order: number;
}

export type Speaker = StoredSpeaker & {
  /** URL segment, derived from the name. See lib/slug.ts. */
  slug: string;
};

export interface NewsItem {
  id: string;
  title: LocalizedString;
  slug: string;
  excerpt: LocalizedString;
  body: LocalizedString;
  coverImage?: string;
  publishedAt: string;
  published: boolean;
  author: string;
}

export const SPONSOR_TIERS: SponsorTier[] = [
  "platinum",
  "gold",
  "venue",
  "silver",
  "bronze",
  "community",
  "inkind",
];
