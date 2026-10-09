import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { isTrackEvent } from "@/lib/track";
import { romeDay } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

/**
 * Count one anonymous event (see lib/track for the closed list).
 *
 * Open to anyone, like the notification toggle it reports on. The cost of that
 * is that a script could inflate a counter; the event is a bare name from a
 * fixed list and the dashboard reads these as rough shares, so the exposure is
 * a skewed percentage, not data. Nothing about the caller is stored.
 */
export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { event?: unknown } | null;
  const event = body?.event;
  if (!isTrackEvent(event)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  // One document: totals, plus the same counts per Rome day so the dashboard
  // can show whether refusals cluster around something.
  await db
    .collection("metrics")
    .doc("events")
    .set(
      {
        counts: { [event]: FieldValue.increment(1) },
        daily: { [romeDay(new Date())]: { [event]: FieldValue.increment(1) } },
      },
      { merge: true },
    );

  return NextResponse.json({ ok: true });
}
