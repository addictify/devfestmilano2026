import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { siteConfig } from "@/lib/site";
import { readPublicDoc } from "./firestore-rest";

export type SiteSettings = {
  ticketsAvailable: boolean;
  speakersPublished: boolean;
  schedulePublished: boolean;
  cfpOpen: boolean;
};

const FLAGS = [
  "ticketsAvailable",
  "speakersPublished",
  "schedulePublished",
  "cfpOpen",
] as const;

export function mergeSettings(doc: Record<string, unknown> | null): SiteSettings {
  const out = {} as SiteSettings;
  for (const k of FLAGS) {
    out[k] = typeof doc?.[k] === "boolean" ? (doc[k] as boolean) : siteConfig[k];
  }
  return out;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection("config").doc("site").get();
      return mergeSettings(snap.exists ? (snap.data() as Record<string, unknown>) : null);
    } catch {
      return mergeSettings(null);
    }
  }
  // Static build: config/site is world-readable, so the flags an organizer
  // toggles in /admin reach the build without any credential. Without this the
  // export would always ship the compiled-in defaults.
  return mergeSettings(await readPublicDoc("config/site"));
}
