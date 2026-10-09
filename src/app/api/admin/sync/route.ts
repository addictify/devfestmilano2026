import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { runSessionizeSync } from "@/lib/sessionize/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** When Sessionize was last pulled in, for the admin card. */
export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const lastSync = (await db.collection("config").doc("site").get()).get("lastSync") as Timestamp | undefined;
  return NextResponse.json({ ok: true, lastSync: lastSync ? lastSync.toDate().toISOString() : null });
}

/**
 * Sync now, instead of waiting for the hourly job. Same code path, so a real
 * change also rebuilds the public site (see AUTO_PUBLISH in the functions
 * adapter); an unchanged Sessionize writes nothing new and rebuilds nothing.
 */
export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const outcome = await runSessionizeSync();
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, reason: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
