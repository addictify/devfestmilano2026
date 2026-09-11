import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchSessionizeAll } from "@/lib/sessionize/client";
import { normalizeSessionize } from "@/lib/sessionize/normalize";
import { contentFingerprint } from "@/lib/sessionize/fingerprint";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls speakers/sessions/tracks from Sessionize into Firestore, then
// refreshes the ISR pages. Triggered by Vercel Cron (GET + Authorization:
// Bearer CRON_SECRET) or manually (?secret=REVALIDATE_SECRET).
function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const secret = new URL(request.url).searchParams.get("secret");
  return Boolean(
    process.env.REVALIDATE_SECRET && secret === process.env.REVALIDATE_SECRET,
  );
}

/**
 * Remove synced documents that Sessionize no longer returns.
 *
 * Without this the sync only ever adds: a talk that gets withdrawn, rejected or
 * unconfirmed stays on the site forever, announcing someone who isn't speaking.
 * Only documents this sync wrote are eligible — anything added by hand in
 * /admin has no `source: "sessionize"` and is left alone.
 */
async function removeVanished(
  db: FirebaseFirestore.Firestore,
  collection: string,
  keepIds: Set<string>,
): Promise<number> {
  const snap = await db.collection(collection).get();
  const doomed = snap.docs.filter(
    (d) => d.data().source === "sessionize" && !keepIds.has(d.id),
  );
  for (let i = 0; i < doomed.length; i += 400) {
    const batch = db.batch();
    for (const doc of doomed.slice(i, i + 400)) batch.delete(doc.ref);
    await batch.commit();
  }
  return doomed.length;
}

async function writeCollection(
  db: Firestore,
  collection: string,
  items: { id: string }[],
): Promise<void> {
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

async function handler(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // Also covers credentials that are well-formed but rejected at init.
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Firebase Admin not configured" },
      { status: 503 },
    );
  }

  let data;
  try {
    data = await fetchSessionizeAll();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 502 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "SESSIONIZE_EVENT_ID not set" },
      { status: 400 },
    );
  }

  const { speakers, sessions, tracks } = normalizeSessionize(data);

  // The sync runs hourly whether or not Sessionize changed. Marking the site as
  // needing a rebuild every time would leave the admin banner permanently
  // claiming there's something to publish, training everyone to ignore it —
  // so compare against what was synced last and only flag a real change.
  const fingerprint = contentFingerprint({ speakers, sessions, tracks });
  const configRef = db.collection("config").doc("site");
  const previous = (await configRef.get()).data()?.lastSyncFingerprint as
    | string
    | undefined;
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
  await configRef.set(
    { lastSync: Timestamp.now(), lastSyncFingerprint: fingerprint },
    { merge: true },
  );

  if (changed || removedAny) {
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/speakers`);
      revalidatePath(`/${locale}/agenda`);
    }
    revalidatePath("/[locale]/speakers/[id]", "page");
  }

  return NextResponse.json({
    ok: true,
    // Lets a caller (and the logs) tell a no-op sync from one that found
    // something new.
    changed: changed || removedAny,
    removed,
    counts: {
      speakers: speakers.length,
      sessions: sessions.length,
      tracks: tracks.length,
    },
    syncedAt: new Date().toISOString(),
  });
}

export { handler as GET, handler as POST };
