import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { toPublicAnnouncement } from "@/lib/push/announcements";

export const dynamic = "force-dynamic";

/** How far back the public list goes; a one-day event never gets near it. */
const LIMIT = 50;

/**
 * Everything the organizers have announced, newest first, for the
 * notifications page. Public and unauthenticated: it is what every
 * subscribed phone was already shown.
 */
export async function GET() {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const snap = await db.collection("announcements").orderBy("sentAt", "desc").limit(LIMIT).get();
  const announcements = snap.docs
    .map((d) => toPublicAnnouncement(d.id, d.data()))
    .filter((a) => a !== null);
  // Not cached: someone tapping a push that just arrived must find it here.
  return NextResponse.json({ ok: true, announcements }, { headers: { "cache-control": "no-store" } });
}
