import "server-only";
import { revalidatePath } from "next/cache";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { routing } from "@/i18n/routing";
import { fetchSessionizeAll } from "./client";
import { normalizeSessionize } from "./normalize";
import { contentFingerprint } from "./fingerprint";

/**
 * Pull speakers/sessions/tracks from Sessionize into Firestore. Shared by the
 * hourly job (/api/sync) and the admin's "Sincronizza ora" (/api/admin/sync).
 */

export type SyncOutcome =
  | {
      ok: true;
      /** Whether Sessionize differed from the last sync (or something was removed). */
      changed: boolean;
      removed: { tracks: number; speakers: number; sessions: number };
      counts: { speakers: number; sessions: number; tracks: number };
      syncedAt: string;
    }
  | { ok: false; status: number; error: string };

/**
 * Remove synced documents that Sessionize no longer returns.
 *
 * Without this the sync only ever adds: a talk that gets withdrawn, rejected or
 * unconfirmed stays on the site forever, announcing someone who isn't speaking.
 * Only documents this sync wrote are eligible — anything added by hand in
 * /admin has no `source: "sessionize"` and is left alone.
 */
async function removeVanished(db: Firestore, collection: string, keepIds: Set<string>): Promise<number> {
  const snap = await db.collection(collection).get();
  const doomed = snap.docs.filter((d) => d.data().source === "sessionize" && !keepIds.has(d.id));
  for (let i = 0; i < doomed.length; i += 400) {
    const batch = db.batch();
    for (const doc of doomed.slice(i, i + 400)) batch.delete(doc.ref);
    await batch.commit();
  }
  return doomed.length;
}

async function writeCollection(db: Firestore, collection: string, items: { id: string }[]): Promise<void> {
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    for (const { id, ...rest } of items.slice(i, i + 400)) {
      batch.set(
        db.collection(collection).doc(id),
        { ...rest, source: "sessionize", syncedAt: Timestamp.now() },
        // merge:true preserves admin-set fields written under the same doc.
        { merge: true },
      );
    }
    await batch.commit();
  }
}

export async function runSessionizeSync(): Promise<SyncOutcome> {
  // Also covers credentials that are well-formed but rejected at init.
  const db = getAdminDb();
  if (!db) return { ok: false, status: 503, error: "Firebase Admin not configured" };

  let data;
  try {
    data = await fetchSessionizeAll();
  } catch (error) {
    return { ok: false, status: 502, error: String(error) };
  }
  if (!data) return { ok: false, status: 400, error: "SESSIONIZE_EVENT_ID not set" };

  const { speakers, sessions, tracks } = normalizeSessionize(data);

  // The sync runs hourly whether or not Sessionize changed. Marking the site as
  // needing a rebuild every time would leave the admin banner permanently
  // claiming there's something to publish, training everyone to ignore it —
  // so compare against what was synced last and only flag a real change.
  const fingerprint = contentFingerprint({ speakers, sessions, tracks });
  const configRef = db.collection("config").doc("site");
  const previous = (await configRef.get()).data()?.lastSyncFingerprint as string | undefined;
  const changed = previous !== fingerprint;

  await writeCollection(db, "tracks", tracks);
  await writeCollection(db, "speakers", speakers);
  await writeCollection(db, "sessions", sessions);

  const removed = {
    tracks: await removeVanished(db, "tracks", new Set(tracks.map((t) => t.id))),
    speakers: await removeVanished(db, "speakers", new Set(speakers.map((s) => s.id))),
    sessions: await removeVanished(db, "sessions", new Set(sessions.map((s) => s.id))),
  };
  const removedAny = Object.values(removed).some((n) => n > 0);
  await configRef.set({ lastSync: Timestamp.now(), lastSyncFingerprint: fingerprint }, { merge: true });

  // Revalidating is also the signal the Cloud Functions adapter acts on: it
  // rebuilds the static site only when these paths were touched.
  if (changed || removedAny) {
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/speakers`);
      revalidatePath(`/${locale}/agenda`);
    }
    revalidatePath("/[locale]/speakers/[id]", "page");
  }

  return {
    ok: true,
    changed: changed || removedAny,
    removed,
    counts: { speakers: speakers.length, sessions: sessions.length, tracks: tracks.length },
    syncedAt: new Date().toISOString(),
  };
}
