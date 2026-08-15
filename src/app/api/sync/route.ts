import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchSessionizeAll } from "@/lib/sessionize/client";
import { normalizeSessionize } from "@/lib/sessionize/normalize";
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
  await writeCollection(db, "tracks", tracks);
  await writeCollection(db, "speakers", speakers);
  await writeCollection(db, "sessions", sessions);
  await db
    .collection("config")
    .doc("site")
    .set({ lastSync: Timestamp.now() }, { merge: true });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/speakers`);
    revalidatePath(`/${locale}/agenda`);
  }
  revalidatePath("/[locale]/speakers/[id]", "page");

  return NextResponse.json({
    ok: true,
    counts: {
      speakers: speakers.length,
      sessions: sessions.length,
      tracks: tracks.length,
    },
    syncedAt: new Date().toISOString(),
  });
}

export { handler as GET, handler as POST };
