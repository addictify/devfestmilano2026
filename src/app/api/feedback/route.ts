import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyUser } from "@/lib/auth/user-guard";
import {
  nextAggregate,
  publicRating,
  type RatingAggregate,
} from "@/lib/feedback-aggregate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  if (typeof sessionId !== "string" || !sessionId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const sessionRef = db.collection("feedback").doc(sessionId);
  const responseRef = sessionRef.collection("responses").doc(uid);
  const totalsRef = sessionRef.collection("totals").doc("aggregate");

  // The response doc is keyed by uid, so a second submission replaces the first
  // — one vote per person, by construction. The counters have to be adjusted,
  // not incremented, or revising a vote would add a voter. A transaction
  // because two people rating the same talk at the same moment is exactly what
  // happens when a session ends.
  const published = await db.runTransaction(async (tx) => {
    const [previous, stored] = await Promise.all([
      tx.get(responseRef),
      tx.get(totalsRef),
    ]);
    const previousRating = previous.exists ? Number(previous.data()?.rating) : null;
    const next = nextAggregate(
      stored.exists ? (stored.data() as Partial<RatingAggregate>) : null,
      Number.isInteger(previousRating) ? previousRating : null,
      rating,
    );

    tx.set(
      responseRef,
      { rating, comment, at: FieldValue.serverTimestamp() },
      { merge: true },
    );
    // Running totals, including the sum. Not readable by any client: with a
    // count of 1 the sum *is* that person's rating.
    tx.set(totalsRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
    // The world-readable projection. `set` without merge, so dropping back
    // below the threshold (or an older shape that carried `sum`) removes the
    // field rather than leaving it behind.
    tx.set(sessionRef, {
      ...publicRating(next),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return publicRating(next);
  });

  return NextResponse.json({ ok: true, ...published });
}
